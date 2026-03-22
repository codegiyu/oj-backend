import mongoose, { Schema, model } from 'mongoose';
import {
  ACCOUNT_STATUSES,
  AuthUserRole,
  GENDERS,
  ModelUser,
  UserPreferences,
} from '../lib/types/constants';

export const DISALLOWED_FIELDS = [
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
  'googleId',
  'auth',
  'accountStatus',
  'email',
  'kyc',
];

export const unselectedFields = [
  'auth.password', // Excludes entire auth.password (value, passwordChangedAt)
  'auth.refreshTokenJTI',
  'isDeleted',
  'deleteRequestedAt',
  'deletionApprovedAt',
  'deletionApprovedBy',
];

const preferencesSchema = new Schema<UserPreferences>(
  {
    realtimeNotifications: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    marketingEmails: { type: Boolean, default: false },
  },
  { _id: false }
);

export const UserSchema = new Schema<ModelUser>(
  {
    googleId: { type: String, unique: true, sparse: true, index: true },
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    title: { type: String },
    avatar: { type: String, default: '' },
    gender: { type: String, enum: GENDERS },
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: 'unverified',
    },
    email: { type: String, required: true, unique: true, index: true },
    phoneNumber: { type: String, sparse: true, index: true },
    auth: {
      password: {
        value: { type: String, required: false },
        passwordChangedAt: { type: Date },
      },
      roles: {
        type: [
          {
            _id: false,
            slug: { type: String, required: true },
            roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
          },
        ],
        validate: [
          {
            validator: function (this: mongoose.Document, value: AuthUserRole[]) {
              return value && value.length > 0;
            },
            message: 'There must be at least one role.',
          },
        ],
      },
      permissions: {
        type: [
          {
            _id: false,
            slug: { type: String, required: true },
            name: { type: String, required: true },
            description: { type: String, required: true },
            isRestricted: { type: Boolean },
          },
        ],
        default: [],
      },
      lastLogin: { type: Date },
      refreshTokenJTI: { type: String, default: '' },
    },
    kyc: {
      email: {
        isVerified: { type: Boolean, default: false },
        data: { type: Schema.Types.Mixed },
      },
      phoneNumber: {
        isVerified: { type: Boolean, default: false },
        data: { type: Schema.Types.Mixed },
      },
    },
    preferences: { type: preferencesSchema },
    artistId: { type: Schema.Types.ObjectId, ref: 'Artist', default: null },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', default: null },
    isDeleted: { type: Boolean, default: false },
    deleteRequestedAt: { type: Date },
    deletionApprovedAt: { type: Date },
    deletionApprovedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true, collection: 'users' }
);

// Exclude soft-deleted users from queries by default
UserSchema.pre(/^find/, function () {
  this.find({ isDeleted: { $ne: true } });
});

export const User = mongoose.models.User || model<ModelUser>('User', UserSchema);
