import mongoose, { Schema, model } from 'mongoose';
import {
  ACCOUNT_STATUSES,
  AuthUserRole,
  ModelAdmin,
  UserPreferences,
} from '../lib/types/constants';

export const unselectedFields = [
  'auth.password',
  'auth.password.value',
  'auth.password.passwordChangedAt',
  'auth.refreshTokenJTI',
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

export const AdminSchema = new Schema<ModelAdmin>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: 'unverified',
    },
    email: { type: String, required: true, unique: true, index: true },
    avatar: { type: String, default: '' },
    auth: {
      password: {
        value: { type: String, required: true },
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
            validator: function (value: AuthUserRole[]) {
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
      pushToken: { type: String, default: '' },
    },
    preferences: { type: preferencesSchema },
  },
  { timestamps: true, collection: 'admins' }
);

export const Admin = mongoose.models.Admin || model<ModelAdmin>('Admin', AdminSchema);
