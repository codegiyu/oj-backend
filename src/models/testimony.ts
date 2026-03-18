import mongoose, { Schema, model } from 'mongoose';
import type { ModelTestimony } from '../lib/types/constants';

const testimonySchema = new Schema<ModelTestimony>(
  {
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    author: { type: String, required: true, trim: true },
    avatar: { type: String, default: '' },
    content: { type: String, required: true },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    category: { type: String, default: '', index: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true, collection: 'testimonies' }
);

testimonySchema.index({ status: 1, isFeatured: 1, createdAt: -1 });
testimonySchema.index({ status: 1, category: 1, createdAt: -1 });

export const Testimony =
  mongoose.models.Testimony || model<ModelTestimony>('Testimony', testimonySchema);
