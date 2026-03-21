import mongoose, { Schema, model } from 'mongoose';
import type { ModelResourceDownloadCategory } from '../lib/types/constants';

const resourceDownloadCategorySchema = new Schema<ModelResourceDownloadCategory>(
  {
    title: { type: String, required: true, trim: true },
    count: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    icon: { type: String, required: true, trim: true },
    href: { type: String, required: true, trim: true },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'resourcedownloadcategories' }
);

resourceDownloadCategorySchema.index({ isActive: 1, displayOrder: 1 });

export const ResourceDownloadCategory =
  mongoose.models.ResourceDownloadCategory ||
  model<ModelResourceDownloadCategory>('ResourceDownloadCategory', resourceDownloadCategorySchema);
