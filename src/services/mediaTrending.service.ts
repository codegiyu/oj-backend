import mongoose from 'mongoose';
import { resolveTrendingWindow } from '../constants/mediaTrending';
import { Video } from '../models/video';
import { NewsArticle } from '../models/newsArticle';
import { ARTIST_POPULATE_SELECT } from '../controllers/artist/artist.helpers';
import { getCumulativeVideoViewsAtOrBefore } from '../repositories/charts/videoDailyMetrics.repository';
import { getCumulativeNewsViewsAtOrBefore } from '../repositories/charts/newsDailyMetrics.repository';

function createdAtMs(doc: Record<string, unknown>): number {
  const value = doc.createdAt;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value).getTime();
  }

  return 0;
}

function toObjectIds(docs: Record<string, unknown>[]): mongoose.Types.ObjectId[] {
  return docs
    .map(doc => {
      const id = doc._id;
      if (id instanceof mongoose.Types.ObjectId) return id;
      if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
        return new mongoose.Types.ObjectId(id);
      }

      return null;
    })
    .filter((id): id is mongoose.Types.ObjectId => id != null);
}

export type PeriodViewRow = {
  doc: Record<string, unknown>;
  periodViews: number;
};

/**
 * Rank docs by period views, then append recent remainder for sparse windows.
 * Paginate the combined list so page 2+ stays continuous.
 */
export function paginateTrendingWithRecentBackfill(options: {
  scored: PeriodViewRow[];
  allDocs: Record<string, unknown>[];
  page: number;
  limit: number;
}): { pageRows: PeriodViewRow[]; total: number } {
  const { scored, allDocs, page, limit } = options;
  const scoredIds = new Set(scored.map(row => String(row.doc._id)));
  const recentRemainder = allDocs
    .filter(doc => !scoredIds.has(String(doc._id)))
    .sort((a, b) => createdAtMs(b) - createdAtMs(a))
    .map(doc => ({ doc, periodViews: 0 }));

  const combined = [...scored, ...recentRemainder];
  const skip = (page - 1) * limit;
  const pageRows = combined.slice(skip, skip + limit);

  return {
    pageRows,
    total: combined.length,
  };
}

async function rankByPeriodViews(options: {
  docs: Record<string, unknown>[];
  viewsField: string;
  getCumulativeViewsAtOrBefore: (
    ids: mongoose.Types.ObjectId[],
    at: Date
  ) => Promise<Map<string, number>>;
  page: number;
  limit: number;
  now?: Date;
  backfillRecentWhenSparse?: boolean;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const { windowStart, windowEnd } = resolveTrendingWindow(options.now);
  const ids = toObjectIds(options.docs);

  const [startViews, endViews] = await Promise.all([
    options.getCumulativeViewsAtOrBefore(ids, windowStart),
    options.getCumulativeViewsAtOrBefore(ids, windowEnd),
  ]);

  const scored = options.docs
    .map(doc => {
      const id = String(doc._id);
      const cumulative =
        typeof doc[options.viewsField] === 'number' ? (doc[options.viewsField] as number) : 0;
      const end = endViews.get(id) ?? cumulative;
      const start = startViews.get(id) ?? 0;
      const periodViews = Math.max(0, end - start);

      return { doc, periodViews };
    })
    .filter(row => row.periodViews > 0)
    .sort((a, b) => {
      if (b.periodViews !== a.periodViews) return b.periodViews - a.periodViews;

      return createdAtMs(b.doc) - createdAtMs(a.doc);
    });

  const { pageRows, total } = options.backfillRecentWhenSparse
    ? paginateTrendingWithRecentBackfill({
        scored,
        allDocs: options.docs,
        page: options.page,
        limit: options.limit,
      })
    : {
        pageRows: scored.slice(
          (options.page - 1) * options.limit,
          (options.page - 1) * options.limit + options.limit
        ),
        total: scored.length,
      };

  const items = pageRows.map(row => {
    const lifetimeViews =
      typeof row.doc.views === 'number' ? row.doc.views : Number(row.doc.views) || 0;

    return {
      ...row.doc,
      periodViews: row.periodViews,
      views: lifetimeViews,
    };
  });

  return { items, total };
}

export async function getTrendingVideosList(options: {
  filter: Record<string, unknown>;
  page: number;
  limit: number;
  now?: Date;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const docs = await Video.find(options.filter).populate('artist', ARTIST_POPULATE_SELECT).lean();

  return rankByPeriodViews({
    docs: docs as unknown as Record<string, unknown>[],
    viewsField: 'views',
    getCumulativeViewsAtOrBefore: getCumulativeVideoViewsAtOrBefore,
    page: options.page,
    limit: options.limit,
    now: options.now,
    backfillRecentWhenSparse: true,
  });
}

export async function getTrendingNewsList(options: {
  filter: Record<string, unknown>;
  page: number;
  limit: number;
  now?: Date;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const docs = await NewsArticle.find(options.filter).lean();

  return rankByPeriodViews({
    docs: docs as unknown as Record<string, unknown>[],
    viewsField: 'views',
    getCumulativeViewsAtOrBefore: getCumulativeNewsViewsAtOrBefore,
    page: options.page,
    limit: options.limit,
    now: options.now,
  });
}
