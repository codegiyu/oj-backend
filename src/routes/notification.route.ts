import { FastifyInstance } from 'fastify';
import { authenticatePreHandler } from '../middleware/auth.middleware';
import { adminWriteRoute } from '../utils/adminRouteHandlers';
import { catchAsync } from '../utils/catchAsync';
import {
  list,
  create,
  readOne,
  readAll,
  getPreferences,
  updatePreferences,
} from '../controllers/notification/notification.controller';
import { updatePushToken } from '../controllers/notification/updatePushToken';
import {
  listNotificationsQuerystringSchema,
  createNotificationBodySchema,
  readOneNotificationSchema,
  readAllNotificationsBodySchema,
  updatePreferencesBodySchema,
  updatePushTokenBodySchema,
} from '../controllers/notification/notification.validation';

export function registerNotificationRoutes(app: FastifyInstance): void {
  app.get<{
    Querystring: { page?: string; limit?: string; isRead?: string; userId?: string };
  }>(
    '/',
    {
      preHandler: [authenticatePreHandler],
      schema: listNotificationsQuerystringSchema,
    },
    catchAsync(list)
  );

  app.post<{
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
  }>(
    '/create',
    {
      preHandler: adminWriteRoute.preHandler,
      schema: createNotificationBodySchema,
    },
    catchAsync(create)
  );

  app.patch<{
    Params: { notificationId: string };
    Body: { isRead?: boolean };
  }>(
    '/read/:notificationId',
    {
      preHandler: [authenticatePreHandler],
      schema: readOneNotificationSchema,
    },
    catchAsync(readOne)
  );

  app.patch<{ Body: { isRead?: boolean } }>(
    '/read-all',
    {
      preHandler: [authenticatePreHandler],
      schema: readAllNotificationsBodySchema,
    },
    catchAsync(readAll)
  );

  app.get('/preferences', { preHandler: [authenticatePreHandler] }, catchAsync(getPreferences));

  app.patch<{
    Body: { realtime?: boolean; email?: boolean; sms?: boolean; marketingEmails?: boolean };
  }>(
    '/preferences',
    {
      preHandler: [authenticatePreHandler],
      schema: updatePreferencesBodySchema,
    },
    catchAsync(updatePreferences)
  );

  app.patch<{
    Body: { pushTokenUpdate?: { pushToken?: string | null } };
  }>(
    '/push-token',
    {
      preHandler: [authenticatePreHandler],
      schema: updatePushTokenBodySchema,
    },
    catchAsync(updatePushToken)
  );
}
