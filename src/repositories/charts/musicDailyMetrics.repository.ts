import mongoose from 'mongoose';
import { Music } from '../../models/music';
import { MusicDailyMetric } from '../../models/musicDailyMetric';
import { startOfUtcDay } from '../../constants/musicSections';

export async function upsertDailyMetricSnapshot(options: {
  musicId: mongoose.Types.ObjectId;
  date: Date;
  cumulativePlays: number;
  cumulativeViews: number;
}): Promise<void> {
  const day = startOfUtcDay(options.date);

  await MusicDailyMetric.updateOne(
    { musicId: options.musicId, date: day },
    {
      $set: {
        cumulativePlays: options.cumulativePlays,
        cumulativeViews: options.cumulativeViews,
      },
    },
    { upsert: true }
  );
}

export async function snapshotAllPublishedMusicMetrics(date: Date = new Date()): Promise<number> {
  const day = startOfUtcDay(date);
  const tracks = await Music.find({ status: 'published' }).select('_id plays views').lean();

  let count = 0;

  for (const track of tracks) {
    const musicId = track._id;
    if (!musicId) continue;
    await upsertDailyMetricSnapshot({
      musicId,
      date: day,
      cumulativePlays: typeof track.plays === 'number' ? track.plays : 0,
      cumulativeViews: typeof track.views === 'number' ? track.views : 0,
    });
    count += 1;
  }

  return count;
}

export async function getCumulativePlaysAtOrBefore(
  musicIds: mongoose.Types.ObjectId[],
  at: Date
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (musicIds.length === 0) return result;

  const day = startOfUtcDay(at);
  const rows = await MusicDailyMetric.aggregate<{ _id: mongoose.Types.ObjectId; plays: number }>([
    { $match: { musicId: { $in: musicIds }, date: { $lte: day } } },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: '$musicId',
        plays: { $first: '$cumulativePlays' },
      },
    },
  ]);

  for (const row of rows) {
    result.set(String(row._id), row.plays ?? 0);
  }

  return result;
}
