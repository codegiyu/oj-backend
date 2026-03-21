import mongoose, { Schema, model } from 'mongoose';
import type { ModelContactMethod } from '../lib/types/constants';

const contactMethodSchema = new Schema<ModelContactMethod>(
  {
    method: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    icon: { type: String, required: true, trim: true, lowercase: true },
    displayOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'contactmethods' }
);

contactMethodSchema.index({ isActive: 1, displayOrder: 1 });

export const ContactMethod =
  mongoose.models.ContactMethod || model<ModelContactMethod>('ContactMethod', contactMethodSchema);
