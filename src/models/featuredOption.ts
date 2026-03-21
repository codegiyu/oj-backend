import mongoose, { Schema, model } from 'mongoose';
import type { ModelFeaturedOption } from '../lib/types/constants';

const featuredOptionSchema = new Schema<ModelFeaturedOption>(
  {
    title: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    price: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    features: { type: [String], required: true, default: [] },
    icon: { type: String, required: true, trim: true, lowercase: true },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'featuredoptions' }
);

featuredOptionSchema.index({ isActive: 1, displayOrder: 1 });

export const FeaturedOption =
  mongoose.models.FeaturedOption || model<ModelFeaturedOption>('FeaturedOption', featuredOptionSchema);
