import { Schema, model } from 'mongoose';
import type { ModelPastorApplication } from '../lib/types/constants';

const pastorApplicationSchema = new Schema<ModelPastorApplication>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    name: { type: String, required: true, trim: true },
    title: { type: String, default: '' },
    church: { type: String, default: '' },
    bio: { type: String, default: '' },
    image: { type: String, default: '' },
    expertise: { type: [String], default: [] },
    motivation: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    rejectedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    pastor: { type: Schema.Types.ObjectId, ref: 'Pastor', default: null },
  },
  { timestamps: true, collection: 'pastorapplications' }
);

pastorApplicationSchema.index({ status: 1, createdAt: -1 });

export const PastorApplication = model<ModelPastorApplication>(
  'PastorApplication',
  pastorApplicationSchema
);
