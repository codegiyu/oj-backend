import { Schema, model } from 'mongoose';

/** Short-lived keys for idempotency / session dedupe on public analytics events. */
const contentAnalyticsDedupeSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
  },
  { timestamps: true, collection: 'content_analytics_dedupe' }
);

contentAnalyticsDedupeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const ContentAnalyticsDedupe = model('ContentAnalyticsDedupe', contentAnalyticsDedupeSchema);
