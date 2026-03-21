import mongoose, { Schema, model } from 'mongoose';
import type { ModelPromotionPricingOption } from '../lib/types/constants';

const promotionPricingOptionSchema = new Schema<ModelPromotionPricingOption>(
  {
    title: { type: String, required: true, trim: true },
    price: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    features: { type: [String], required: true, default: [] },
    isFeatured: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'promotionpricingoptions' }
);

promotionPricingOptionSchema.index({ isActive: 1, displayOrder: 1 });

export const PromotionPricingOption =
  mongoose.models.PromotionPricingOption ||
  model<ModelPromotionPricingOption>('PromotionPricingOption', promotionPricingOptionSchema);
