import { Schema, model } from 'mongoose';

const videoDailyMetricSchema = new Schema(
  {
    videoId: { type: Schema.Types.ObjectId, ref: 'Video', required: true, index: true },
    date: { type: Date, required: true, index: true },
    cumulativeViews: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: 'video_daily_metrics' }
);

videoDailyMetricSchema.index({ videoId: 1, date: 1 }, { unique: true });

export const VideoDailyMetric = model('VideoDailyMetric', videoDailyMetricSchema);
