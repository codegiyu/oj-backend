import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { Notification } from '../../models/notification';
import { User } from '../../models/user';
import { Admin } from '../../models/admin';
import {
  listNotificationsForUser,
  dispatchNotification,
} from '../../services/notification.service';
import { getAuthUser } from '../../utils/getAuthUser';
import { invalidateAuthCache } from '../../utils/authCache';

export async function list(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; isRead?: string; userId?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user) throw new AppError('Unauthorized', 401);
  const isAdmin = user.scope === 'console-access';
  const page = Math.max(1, parseInt(request.query.page ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? '20', 10)));
  const isRead = request.query.isRead === 'true' ? true : request.query.isRead === 'false' ? false : undefined;
  let userId = user.userId;
  let userModel: 'User' | 'Admin' = user.scope === 'console-access' ? 'Admin' : 'User';
  if (isAdmin && request.query.userId) {
    userId = request.query.userId;
    userModel = 'User';
  }
  const result = await listNotificationsForUser(userId, userModel, { page, limit, isRead });
  sendResponse(reply, 200, {
    notifications: result.notifications,
    meta: result.meta,
  }, 'Notifications loaded.');
}

export async function create(
  request: FastifyRequest<{
    Body: {
      userId: string;
      userModel: 'User' | 'Admin';
      title: string;
      message: string;
      eventType?: string;
      triggerDate?: string;
      expiresAt?: string;
      sendRealTime?: boolean;
      sendEmail?: boolean;
      subject?: string;
      context?: Record<string, unknown>;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'console-access') throw new AppError('Forbidden', 403);
  const body = request.body;
  if (!body.userId || !body.userModel || !body.title || !body.message) {
    throw new AppError('userId, userModel, title, and message are required', 400);
  }
  if (!['User', 'Admin'].includes(body.userModel)) throw new AppError('userModel must be User or Admin', 400);
  if (!mongoose.Types.ObjectId.isValid(body.userId)) throw new AppError('Invalid userId', 400);
  const notification = await dispatchNotification({
    userId: body.userId,
    userModel: body.userModel,
    title: body.title,
    message: body.message,
    eventType: body.eventType,
    triggerDate: body.triggerDate ? new Date(body.triggerDate) : undefined,
    expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    sendRealTime: body.sendRealTime ?? true,
    sendEmail: body.sendEmail ?? false,
    subject: body.subject,
    context: body.context,
  });
  if (!notification) throw new AppError('User not found', 404);
  sendResponse(reply, 201, { notification }, 'Notification created.');
}

export async function readOne(
  request: FastifyRequest<{
    Params: { notificationId: string };
    Body: { isRead?: boolean };
  }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user) throw new AppError('Unauthorized', 401);
  const { notificationId } = request.params;
  const isRead = request.body.isRead ?? true;
  if (!mongoose.Types.ObjectId.isValid(notificationId)) throw new AppError('Invalid notificationId', 400);
  const userModel: 'User' | 'Admin' = user.scope === 'console-access' ? 'Admin' : 'User';
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      user: new mongoose.Types.ObjectId(user.userId),
      userModel,
    },
    { isRead, readAt: isRead ? new Date() : null },
    { returnDocument: 'after' }
  ).lean();
  if (!notification) throw new AppError('Notification not found', 404);
  sendResponse(reply, 200, {
    notification: {
      _id: notification._id,
      isRead: notification.isRead,
      readAt: notification.readAt,
      status: notification.status,
    },
  }, 'Notification updated.');
}

export async function readAll(
  request: FastifyRequest<{ Body: { isRead?: boolean } }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user) throw new AppError('Unauthorized', 401);
  const isRead = request.body.isRead ?? true;
  const userModel: 'User' | 'Admin' = user.scope === 'console-access' ? 'Admin' : 'User';
  const result = await Notification.updateMany(
    { user: new mongoose.Types.ObjectId(user.userId), userModel },
    { isRead, readAt: isRead ? new Date() : null }
  );
  sendResponse(reply, 200, {
    meta: {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      isRead,
    },
  }, 'Notifications updated.');
}

export async function getPreferences(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user) throw new AppError('Unauthorized', 401);
  const Model = user.scope === 'console-access' ? Admin : User;
  const doc = await Model.findById(user.userId).select('preferences').lean();
  const prefs = doc?.preferences ?? {};
  sendResponse(reply, 200, {
    notificationPreferences: {
      realtime: prefs.realtimeNotifications ?? true,
      email: prefs.emailNotifications ?? true,
      sms: prefs.smsNotifications ?? false,
      marketingEmails: prefs.marketingEmails ?? false,
    },
  }, 'Preferences loaded.');
}

export async function updatePreferences(
  request: FastifyRequest<{
    Body: { realtime?: boolean; email?: boolean; sms?: boolean; marketingEmails?: boolean };
  }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user) throw new AppError('Unauthorized', 401);
  const body = request.body;
  const Model = user.scope === 'console-access' ? Admin : User;
  const update: Record<string, boolean> = {};
  if (body.realtime !== undefined) update['preferences.realtimeNotifications'] = body.realtime;
  if (body.email !== undefined) update['preferences.emailNotifications'] = body.email;
  if (body.sms !== undefined) update['preferences.smsNotifications'] = body.sms;
  if (body.marketingEmails !== undefined) update['preferences.marketingEmails'] = body.marketingEmails;
  if (Object.keys(update).length === 0) {
    sendResponse(reply, 200, { success: true }, 'Preferences unchanged.');
    return;
  }
  await Model.findByIdAndUpdate(user.userId, { $set: update });
  await invalidateAuthCache(user.email, user.scope === 'console-access' ? 'admin' : 'user');
  sendResponse(reply, 200, { success: true }, 'Preferences updated.');
}
