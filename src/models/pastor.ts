import { Schema, model } from 'mongoose';
import type { ModelPastor } from '../lib/types/constants';

const pastorSchema = new Schema<ModelPastor>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
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
    profileStatus: {
      type: String,
      enum: ['active', 'deactivated', 'suspended'],
      default: 'active',
      index: true,
    },
    suspensionReason: { type: String, default: '' },
    statusChangedAt: { type: Date, default: null },
    statusChangedBy: { type: Schema.Types.ObjectId, default: null },
    displayOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true, collection: 'pastors' }
);

pastorSchema.index({ isActive: 1, displayOrder: 1 });

export const Pastor = model<ModelPastor>('Pastor', pastorSchema);
