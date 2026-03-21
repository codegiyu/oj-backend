import mongoose, { Schema, model } from 'mongoose';
import type { ModelDevotional } from '../lib/types/constants';

const devotionalSchema = new Schema<ModelDevotional>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    excerpt: { type: String, default: '' },
    content: { type: String, default: '' },
    type: {
      type: String,
      enum: ['daily', 'latest', 'popular', 'bible-study', 'prayer-points', 'living-tips', 'marriage-family'],
      default: 'latest',
      index: true,
    },
    category: { type: String, default: '', index: true },
    author: { type: String, default: '' },
    verse: { type: String, default: '' },
    date: { type: Date, default: null },
    readingTime: { type: Number, default: 0 },
    lessons: { type: [String], default: [] },
    duration: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0, index: true },
    // Moderation
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    rejectionReason: { type: String, default: '' },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true, collection: 'devotionals' }
);

devotionalSchema.index({ status: 1, type: 1, createdAt: -1 });
devotionalSchema.index({ status: 1, category: 1, createdAt: -1 });

export const Devotional =
  mongoose.models.Devotional || model<ModelDevotional>('Devotional', devotionalSchema);
