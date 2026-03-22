import {
  ModelNotification,
  NotificationEmailDelivery,
} from '../lib/types/constants';
import mongoose, { Schema, model } from 'mongoose';

const emailDeliverySchema = new Schema<NotificationEmailDelivery>(
  {
    status: {
      type: String,
      enum: ['pending', 'queued', 'sent', 'failed', 'skipped', 'disabled'],
      default: 'pending',
    },
    jobId: { type: String },
    lastAttemptAt: { type: Date },
    lastSentAt: { type: Date },
    lastError: { type: String },
    statusReason: { type: String },
  },
  { _id: false }
);

const notificationSchema = new Schema<ModelNotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'userModel',
      index: true,
    },
    userModel: { type: String, required: true, enum: ['User', 'Admin'] },
    eventType: { type: String },
    title: { type: String },
    message: { type: String },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    context: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['active', 'expired'], default: 'active', index: true },
    expiredAt: { type: Date, default: null },
    triggerDate: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    emailDelivery: { type: emailDeliverySchema, default: () => ({ status: 'pending' }) },
  },
  { timestamps: true }
);

notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Filter to active notifications (not expired, trigger date reached)
notificationSchema.pre(/^find/, function () {
  this.find({
    expiresAt: { $gt: new Date() },
    triggerDate: { $lte: new Date() },
  });
});

export const Notification =
  mongoose.models.Notification || model<ModelNotification>('Notification', notificationSchema);
