import mongoose from 'mongoose';
import { Notification } from '../models/notification';
import { User } from '../models/user';
import { Admin } from '../models/admin';
import { sendRealTimeNotification } from '../socket';

export async function expireNotificationsForUser(
  userId: string,
  userModel: 'User' | 'Admin'
): Promise<{ matchedCount: number; modifiedCount: number }> {
  const now = new Date();
  const result = await Notification.updateMany(
    {
      user: new mongoose.Types.ObjectId(userId),
      userModel,
      status: 'active',
      expiresAt: { $lte: now },
    },
    { $set: { status: 'expired', expiredAt: now, isRead: true, readAt: now } }
  );
  return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
}

export async function listNotificationsForUser(
  userId: string,
  userModel: 'User' | 'Admin',
  options: { page?: number; limit?: number; isRead?: boolean } = {}
): Promise<{ notifications: unknown[]; meta: { page: number; limit: number; total: number; totalPages: number; expiredProcessed?: { matchedCount: number; modifiedCount: number } } }> {
  const expired = await expireNotificationsForUser(userId, userModel);
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const skip = (page - 1) * limit;
  const query: Record<string, unknown> = {
    user: new mongoose.Types.ObjectId(userId),
    userModel,
  };
  if (options.isRead !== undefined) {
    query.isRead = options.isRead;
  }
  const [notifications, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
  ]);
  return {
    notifications,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      expiredProcessed: expired,
    },
  };
}

export interface CreateNotificationData {
  user: mongoose.Types.ObjectId;
  userModel: 'User' | 'Admin';
  title?: string;
  message?: string;
  eventType?: string;
  triggerDate?: Date;
  expiresAt?: Date;
  context?: Record<string, unknown>;
}

export async function createAndSendNotification(
  data: CreateNotificationData,
  sendRealTime: boolean
): Promise<unknown> {
  const doc = await Notification.create({
    ...data,
    triggerDate: data.triggerDate ?? new Date(),
    expiresAt: data.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'active',
    isRead: false,
    emailDelivery: { status: 'pending' },
  });
  const notification = doc.toObject();
  if (sendRealTime) {
    sendRealTimeNotification(
      String(notification.user),
      notification.userModel,
      {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        eventType: notification.eventType,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        status: notification.status,
        context: notification.context,
      }
    );
  }
  return notification;
}

export interface DispatchNotificationOptions {
  userId: string;
  userModel: 'User' | 'Admin';
  title: string;
  message: string;
  eventType?: string;
  triggerDate?: Date;
  expiresAt?: Date;
  sendRealTime?: boolean;
  sendEmail?: boolean;
  subject?: string;
  context?: Record<string, unknown>;
}

export async function dispatchNotification(options: DispatchNotificationOptions): Promise<unknown | null> {
  const {
    userId,
    userModel,
    title,
    message,
    eventType,
    triggerDate,
    expiresAt,
    sendRealTime = true,
    sendEmail = false,
    context,
  } = options;
  const Model = userModel === 'Admin' ? Admin : User;
  const user = await Model.findById(userId).select('_id preferences').lean();
  if (!user) return null;
  const notification = await createAndSendNotification(
    {
      user: new mongoose.Types.ObjectId(userId),
      userModel,
      title,
      message,
      eventType,
      triggerDate,
      expiresAt,
      context,
    },
    sendRealTime
  );
  if (sendEmail) {
    // Optional: enqueue notificationEmail job via addJobToQueue
    // Stub for now - can wire BullMQ later
  }
  return notification;
}
