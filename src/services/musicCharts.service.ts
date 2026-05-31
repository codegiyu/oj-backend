import mongoose from 'mongoose';
import {
  normalizeChartPeriod,
  resolveChartWindow,
  type ChartPeriod,
} from '../constants/musicSections';
import { mergePublicFilter, publishedMusicCompletenessFilter } from '../utils/contentCompleteness';
import { Music } from '../models/music';
import { ARTIST_POPULATE_SELECT } from '../controllers/artist/artist.helpers';
import { getCumulativePlaysAtOrBefore } from '../repositories/charts/musicDailyMetrics.repository';
import {
  findChartSnapshot,
  findHistoricalChartSnapshots,
  upsertChartSnapshot,
  type ChartSnapshotDoc,
  type ChartSnapshotEntry,
} from '../repositories/charts/musicChartSnapshot.repository';
import { getFromCache, addToCache, type CacheKey } from '../utils/cache';
import { getRedisClient } from '../config/redis';
import {
  attachChartMovement,
  buildPreviousRankMap,
  type ChartEntry,
  type ChartTrend,
} from './musicCharts.helpers';

const CHART_CACHE_TTL_SECONDS = 900;
const CHART_SCOPE_SET_KEY = 'vol:chart-scopes';

export interface ChartRankedItem {
  music: Record<string, unknown>;
  rank: number;
  trend: ChartTrend;
  change: number;
  chartEntry?: ChartEntry;
  periodPlays: number;
}

async function registerChartScope(scopeKey: string): Promise<void> {
  const redis = getRedisClient();
  await redis.sadd(CHART_SCOPE_SET_KEY, scopeKey);
}

export async function listRegisteredChartScopes(): Promise<string[]> {
  const redis = getRedisClient();
  return redis.smembers(CHART_SCOPE_SET_KEY);
}

function buildScopeFilter(scopeKey: string): Record<string, unknown> {
  const filter: Record<string, unknown> = { status: 'published' };
  if (scopeKey !== 'all') {
    filter.category = scopeKey;
  }

  return mergePublicFilter(filter, publishedMusicCompletenessFilter());
}

async function listPublishedMusicForScope(scopeKey: string): Promise<Record<string, unknown>[]> {
  const filter = buildScopeFilter(scopeKey);
  const docs = await Music.find(filter)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .populate({
      path: 'album',
      select: '_id title slug status',
      match: { status: 'published' },
    })
    .lean();

  return docs as unknown as Record<string, unknown>[];
}

async function computePeriodScoreMap(
  musicDocs: Record<string, unknown>[],
  period: ChartPeriod,
  windowStart: Date,
  windowEnd: Date,
  previousRankMap: Map<string, number>
): Promise<Map<string, { score: number; doc: Record<string, unknown> }>> {
  const result = new Map<string, { score: number; doc: Record<string, unknown> }>();
  const ids = musicDocs
    .map(doc => {
      const id = doc._id;
      if (id instanceof mongoose.Types.ObjectId) return id;
      if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
        return new mongoose.Types.ObjectId(id);
      }

      return null;
    })
    .filter((id): id is mongoose.Types.ObjectId => id != null);

  const [startPlays, endPlays] = await Promise.all([
    period === 'alltime'
      ? Promise.resolve(new Map<string, number>())
      : getCumulativePlaysAtOrBefore(ids, windowStart),
    getCumulativePlaysAtOrBefore(ids, windowEnd),
  ]);

  for (const doc of musicDocs) {
    const id = String(doc._id);
    const cumulative = typeof doc.plays === 'number' ? doc.plays : 0;
    const end = endPlays.get(id) ?? cumulative;
    const start = period === 'alltime' ? 0 : (startPlays.get(id) ?? 0);
    const score = period === 'alltime' ? cumulative : Math.max(0, end - start);

    if (score > 0 || previousRankMap.has(id)) {
      result.set(id, { score, doc });
    }
  }

  return result;
}

function createdAtMs(doc: Record<string, unknown>): number {
  const value = doc.createdAt;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value).getTime();
  }

  return 0;
}

function sortRankedEntries(
  scoreMap: Map<string, { score: number; doc: Record<string, unknown> }>
): Array<{ musicId: string; rank: number; score: number; doc: Record<string, unknown> }> {
  const sorted = [...scoreMap.entries()].sort((a, b) => {
    if (b[1].score !== a[1].score) return b[1].score - a[1].score;

    return createdAtMs(b[1].doc) - createdAtMs(a[1].doc);
  });

  return sorted.map(([musicId, value], index) => ({
    musicId,
    rank: index + 1,
    score: value.score,
    doc: value.doc,
  }));
}

export async function computeChartRankings(options: {
  scopeKey: string;
  period: ChartPeriod;
  window: ReturnType<typeof resolveChartWindow>;
}): Promise<ChartRankedItem[]> {
  const { scopeKey, period, window } = options;

  const [previousSnapshot, historicalSnapshots, musicDocs] = await Promise.all([
    findChartSnapshot(scopeKey, period, window.previousPeriodKey),
    findHistoricalChartSnapshots(scopeKey, period, {
      excludePeriodKey: window.periodKey,
      limit: 26,
    }),
    listPublishedMusicForScope(scopeKey),
  ]);

  const previousRankMap = buildPreviousRankMap(previousSnapshot);
  const scoreMap = await computePeriodScoreMap(
    musicDocs,
    period,
    window.windowStart,
    window.windowEnd,
    previousRankMap
  );
  const ranked = sortRankedEntries(scoreMap);

  const allHistorical = previousSnapshot
    ? [previousSnapshot, ...historicalSnapshots]
    : historicalSnapshots;

  const items: ChartRankedItem[] = ranked.map(row => {
    const movement = attachChartMovement({
      musicId: row.musicId,
      rank: row.rank,
      previousRank: previousRankMap.get(row.musicId),
      historicalSnapshots: allHistorical,
      previousPeriodKey: window.previousPeriodKey,
    });

    return {
      music: row.doc,
      rank: row.rank,
      trend: movement.trend,
      change: movement.change,
      ...(movement.chartEntry ? { chartEntry: movement.chartEntry } : {}),
      periodPlays: row.score,
    };
  });

  const snapshotEntries: ChartSnapshotEntry[] = ranked.map(row => ({
    musicId: new mongoose.Types.ObjectId(row.musicId),
    rank: row.rank,
    score: row.score,
  }));

  const snapshot: ChartSnapshotDoc = {
    scopeKey,
    period,
    periodKey: window.periodKey,
    windowStart: window.windowStart,
    windowEnd: window.windowEnd,
    entries: snapshotEntries,
    computedAt: new Date(),
  };

  await Promise.all([upsertChartSnapshot(snapshot), registerChartScope(scopeKey)]);

  return items;
}

export async function getChartList(options: {
  scopeKey: string;
  period?: string;
  page: number;
  limit: number;
}): Promise<{ items: ChartRankedItem[]; total: number }> {
  const period = normalizeChartPeriod(options.period);
  const window = resolveChartWindow(period);
  const cacheKey = `vol:chart:${options.scopeKey}:${period}:${window.periodKey}` as CacheKey;

  const cached = await getFromCache<ChartRankedItem[]>(cacheKey);
  const allItems =
    cached ??
    (await computeChartRankings({
      scopeKey: options.scopeKey,
      period,
      window,
    }));

  if (!cached) {
    await addToCache(cacheKey, allItems, CHART_CACHE_TTL_SECONDS);
  }

  const skip = (options.page - 1) * options.limit;
  const items = allItems.slice(skip, skip + options.limit);

  return { items, total: allItems.length };
}
