import mongoose, { Schema, model } from 'mongoose';
import type { ModelPartnershipBenefit } from '../lib/types/constants';

const partnershipBenefitSchema = new Schema<ModelPartnershipBenefit>(
  {
    text: { type: String, required: true, trim: true },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'partnershipbenefits' }
);

partnershipBenefitSchema.index({ isActive: 1, displayOrder: 1 });

export const PartnershipBenefit =
  mongoose.models.PartnershipBenefit ||
  model<ModelPartnershipBenefit>('PartnershipBenefit', partnershipBenefitSchema);
