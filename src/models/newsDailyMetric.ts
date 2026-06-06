import { Schema, model } from 'mongoose';

const newsDailyMetricSchema = new Schema(
  {
    articleId: { type: Schema.Types.ObjectId, ref: 'NewsArticle', required: true, index: true },
    date: { type: Date, required: true, index: true },
    cumulativeViews: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: 'news_daily_metrics' }
);

newsDailyMetricSchema.index({ articleId: 1, date: 1 }, { unique: true });

export const NewsDailyMetric = model('NewsDailyMetric', newsDailyMetricSchema);
