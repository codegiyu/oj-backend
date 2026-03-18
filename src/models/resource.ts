import mongoose, { Schema, model } from 'mongoose';
import type { ModelResource } from '../lib/types/constants';

const resourceSchema = new Schema<ModelResource>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: '' },
    type: {
      type: String,
      enum: ['ebook', 'template', 'beat', 'wallpaper', 'affiliate'],
      required: true,
      index: true,
    },
    category: { type: String, default: '', index: true },
    fileUrl: { type: String, default: '' },
    coverImage: { type: String, default: '' },
    price: { type: Number, default: 0 },
    isFree: { type: Boolean, default: true },
    downloads: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    displayOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true, collection: 'resources' }
);

resourceSchema.index({ status: 1, type: 1, createdAt: -1 });

export const Resource =
  mongoose.models.Resource || model<ModelResource>('Resource', resourceSchema);
