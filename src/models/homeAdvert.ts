import mongoose, { Schema, model } from 'mongoose';
import type { HomeAdvertSlot } from '../lib/types/constants';

export interface IHomeAdvertDoc {
  _id: mongoose.Types.ObjectId;
  slot: HomeAdvertSlot;
  imageUrl: string;
  linkUrl: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const homeAdvertSchema = new Schema<IHomeAdvertDoc>(
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

export const HomeAdvert =
  mongoose.models.HomeAdvert || model<IHomeAdvertDoc>('HomeAdvert', homeAdvertSchema);
