import { Schema, model } from 'mongoose';

const chartSnapshotEntrySchema = new Schema(
  {
    musicId: { type: Schema.Types.ObjectId, ref: 'Music', required: true },
    rank: { type: Number, required: true, min: 1 },
    score: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const musicChartSnapshotSchema = new Schema(
  {
    scopeKey: { type: String, required: true, index: true },
    period: { type: String, enum: ['weekly', 'monthly', 'alltime'], required: true },
    periodKey: { type: String, required: true },
    windowStart: { type: Date, required: true },
    windowEnd: { type: Date, required: true },
    entries: { type: [chartSnapshotEntrySchema], default: [] },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'music_chart_snapshots' }
);

musicChartSnapshotSchema.index({ scopeKey: 1, period: 1, periodKey: 1 }, { unique: true });

export const MusicChartSnapshot = model('MusicChartSnapshot', musicChartSnapshotSchema);
