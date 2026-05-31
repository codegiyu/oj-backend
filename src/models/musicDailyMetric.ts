import { Schema, model } from 'mongoose';

const musicDailyMetricSchema = new Schema(
  {
    musicId: { type: Schema.Types.ObjectId, ref: 'Music', required: true, index: true },
    date: { type: Date, required: true, index: true },
    cumulativePlays: { type: Number, default: 0, min: 0 },
    cumulativeViews: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: 'music_daily_metrics' }
);

musicDailyMetricSchema.index({ musicId: 1, date: 1 }, { unique: true });

export const MusicDailyMetric = model('MusicDailyMetric', musicDailyMetricSchema);
