import mongoose, { Schema, model } from 'mongoose';
import type { ModelPrayerRequest } from '../lib/types/constants';

const prayerRequestSchema = new Schema<ModelPrayerRequest>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    content: { type: String, required: true },
    author: { type: String, required: true, trim: true },
    email: { type: String, default: '' },
    category: { type: String, default: '', index: true },
    prayers: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    urgent: { type: Boolean, default: false, index: true },
    testimony: { type: String, default: '' },
    answeredAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'answered'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true, collection: 'prayerrequests' }
);

prayerRequestSchema.index({ status: 1, createdAt: -1 });
prayerRequestSchema.index({ status: 1, category: 1, createdAt: -1 });

export const PrayerRequest =
  mongoose.models.PrayerRequest || model<ModelPrayerRequest>('PrayerRequest', prayerRequestSchema);
