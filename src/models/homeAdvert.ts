import { Schema, model } from 'mongoose';
import { ModelHomeAdvert } from '../lib/types/constants';

const homeAdvertSchema = new Schema<ModelHomeAdvert>(
  {
    slot: {
      type: String,
      required: true,
      enum: ['after_hero', 'before_cta'],
    },
    imageUrl: { type: String, required: true, default: '' },
    linkUrl: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'homeadverts' }
);

homeAdvertSchema.index({ slot: 1, isActive: 1, displayOrder: 1 });

export const HomeAdvert = model<ModelHomeAdvert>('HomeAdvert', homeAdvertSchema);
