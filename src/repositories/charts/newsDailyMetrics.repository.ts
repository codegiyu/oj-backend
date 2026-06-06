import mongoose from 'mongoose';
import { NewsArticle } from '../../models/newsArticle';
import { NewsDailyMetric } from '../../models/newsDailyMetric';
import { startOfUtcDay } from '../../constants/musicSections';

export async function upsertNewsDailyMetricSnapshot(options: {
  articleId: mongoose.Types.ObjectId;
  date: Date;
  cumulativeViews: number;
}): Promise<void> {
  const day = startOfUtcDay(options.date);

  await NewsDailyMetric.updateOne(
    { articleId: options.articleId, date: day },
    { $set: { cumulativeViews: options.cumulativeViews } },
    { upsert: true }
  );
}

export async function snapshotAllPublishedNewsMetrics(date: Date = new Date()): Promise<number> {
  const day = startOfUtcDay(date);
  const articles = await NewsArticle.find({ status: 'published' }).select('_id views').lean();

  let count = 0;

  for (const article of articles) {
    const articleId = article._id;
    if (!articleId) continue;
    await upsertNewsDailyMetricSnapshot({
      articleId,
      date: day,
      cumulativeViews: typeof article.views === 'number' ? article.views : 0,
    });
    count += 1;
  }

  return count;
}

export async function getCumulativeNewsViewsAtOrBefore(
  articleIds: mongoose.Types.ObjectId[],
  at: Date
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (articleIds.length === 0) return result;

  const day = startOfUtcDay(at);
  const rows = await NewsDailyMetric.aggregate<{ _id: mongoose.Types.ObjectId; views: number }>([
    { $match: { articleId: { $in: articleIds }, date: { $lte: day } } },
    { $sort: { date: -1 } },
    {
      $group: {
        _id: '$articleId',
        views: { $first: '$cumulativeViews' },
      },
    },
  ]);

  for (const row of rows) {
    result.set(String(row._id), row.views ?? 0);
  }

  return result;
}
