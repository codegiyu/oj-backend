import mongoose from 'mongoose';
import { MusicChartSnapshot } from '../../models/musicChartSnapshot';
import type { ChartPeriod } from '../../constants/musicSections';

export interface ChartSnapshotEntry {
  musicId: mongoose.Types.ObjectId;
  rank: number;
  score: number;
}

export interface ChartSnapshotDoc {
  scopeKey: string;
  period: ChartPeriod;
  periodKey: string;
  windowStart: Date;
  windowEnd: Date;
  entries: ChartSnapshotEntry[];
  computedAt: Date;
}

export async function findChartSnapshot(
  scopeKey: string,
  period: ChartPeriod,
  periodKey: string
): Promise<ChartSnapshotDoc | null> {
  const doc = await MusicChartSnapshot.findOne({ scopeKey, period, periodKey }).lean();
  if (!doc) return null;

  return doc as unknown as ChartSnapshotDoc;
}

export async function findHistoricalChartSnapshots(
  scopeKey: string,
  period: ChartPeriod,
  options?: { excludePeriodKey?: string; limit?: number }
): Promise<ChartSnapshotDoc[]> {
  const filter: Record<string, unknown> = { scopeKey, period };
  if (options?.excludePeriodKey) {
    filter.periodKey = { $ne: options.excludePeriodKey };
  }

  const docs = await MusicChartSnapshot.find(filter)
    .sort({ computedAt: -1 })
    .limit(options?.limit ?? 26)
    .lean();

  return docs as unknown as ChartSnapshotDoc[];
}

export async function upsertChartSnapshot(snapshot: ChartSnapshotDoc): Promise<void> {
  await MusicChartSnapshot.updateOne(
    {
      scopeKey: snapshot.scopeKey,
      period: snapshot.period,
      periodKey: snapshot.periodKey,
    },
    {
      $set: {
        windowStart: snapshot.windowStart,
        windowEnd: snapshot.windowEnd,
        entries: snapshot.entries,
        computedAt: snapshot.computedAt,
      },
    },
    { upsert: true }
  );
}

export async function pruneChartSnapshots(
  scopeKey: string,
  period: ChartPeriod,
  keepCount: number
): Promise<number> {
  const docs = await MusicChartSnapshot.find({ scopeKey, period })
    .sort({ computedAt: -1 })
    .select('_id')
    .lean();

  if (docs.length <= keepCount) return 0;

  const toDelete = docs.slice(keepCount).map(d => d._id);
  const result = await MusicChartSnapshot.deleteMany({ _id: { $in: toDelete } });

  return result.deletedCount ?? 0;
}
