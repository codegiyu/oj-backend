import mongoose from 'mongoose';
import { Video } from '../../models/video';
import { VideoDailyMetric } from '../../models/videoDailyMetric';
import { startOfUtcDay } from '../../constants/musicSections';

export async function upsertVideoDailyMetricSnapshot(options: {
  videoId: mongoose.Types.ObjectId;
  date: Date;
  cumulativeViews: number;
}): Promise<void> {
  const day = startOfUtcDay(options.date);

  await VideoDailyMetric.updateOne(
    { videoId: options.videoId, date: day },
    { $set: { cumulativeViews: options.cumulativeViews } },
    { upsert: true }
  );
}

export async function snapshotAllPublishedVideoMetrics(date: Date = new Date()): Promise<number> {
  const day = startOfUtcDay(date);
  const videos = await Video.find({ status: 'published' }).select('_id views').lean();

  let count = 0;

  for (const video of videos) {
    const videoId = video._id;
    if (!videoId) continue;
    await upsertVideoDailyMetricSnapshot({
      videoId,
      date: day,
      cumulativeViews: typeof video.views === 'number' ? video.views : 0,
    });
    count += 1;
  }

  return count;
}

export async function getCumulativeVideoViewsAtOrBefore(
  videoIds: mongoose.Types.ObjectId[],
  at: Date
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (videoIds.length === 0) return result;

  const day = startOfUtcDay(at);
  const rows = await VideoDailyMetric.aggregate<{ _id: mongoose.Types.ObjectId; views: number }>([
    { $match: { videoId: { $in: videoIds }, date: { $lte: day } } },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: '$videoId',
        views: { $first: '$cumulativeViews' },
      },
    },
  ]);

  for (const row of rows) {
    result.set(String(row._id), row.views ?? 0);
  }

  return result;
}
