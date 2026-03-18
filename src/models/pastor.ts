import mongoose, { Schema, model } from 'mongoose';
import type { ModelPastor } from '../lib/types/constants';

const pastorSchema = new Schema<ModelPastor>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    title: { type: String, default: '' },
    church: { type: String, default: '' },
    bio: { type: String, default: '' },
    image: { type: String, default: '' },
    expertise: { type: [String], default: [] },
    questionsAnswered: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true, collection: 'pastors' }
);

pastorSchema.index({ isActive: 1, displayOrder: 1 });

export const Pastor = mongoose.models.Pastor || model<ModelPastor>('Pastor', pastorSchema);
