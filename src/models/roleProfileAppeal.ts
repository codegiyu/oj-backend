import mongoose, { Schema, model } from 'mongoose';
import type { AppealStatus, RoleProfileType } from '../lib/types/roleProfile';

export interface IRoleProfileAppeal {
  profileType: RoleProfileType;
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: AppealStatus;
  message: string;
  adminResponse?: string;
  reviewedAt?: Date | null;
  reviewedBy?: mongoose.Types.ObjectId | null;
  supersedesAppealId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const roleProfileAppealSchema = new Schema<IRoleProfileAppeal>(
  {
    profileType: {
      type: String,
      enum: ['vendor', 'artist', 'pastor'],
      required: true,
      index: true,
    },
    profileId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    adminResponse: { type: String, default: '', trim: true, maxlength: 2000 },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    supersedesAppealId: { type: Schema.Types.ObjectId, ref: 'RoleProfileAppeal', default: null },
  },
  { timestamps: true, collection: 'roleprofileappeals' }
);

roleProfileAppealSchema.index({ profileType: 1, profileId: 1, status: 1 });

export const RoleProfileAppeal = model<IRoleProfileAppeal>(
  'RoleProfileAppeal',
  roleProfileAppealSchema
);
