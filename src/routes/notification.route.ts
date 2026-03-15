import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
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

export async function registerNotificationRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: { page?: string; limit?: string; isRead?: string; userId?: string };
  }>(
    '/',
    {
      preHandler: authenticate,
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
      preHandler: authenticate,
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
      preHandler: authenticate,
      schema: readOneNotificationSchema,
    },
    catchAsync(readOne)
  );

  app.patch<{ Body: { isRead?: boolean } }>(
    '/read-all',
    {
      preHandler: authenticate,
      schema: readAllNotificationsBodySchema,
    },
    catchAsync(readAll)
  );

  app.get(
    '/preferences',
    { preHandler: authenticate },
    catchAsync(getPreferences)
  );

  app.patch<{
    Body: { realtime?: boolean; email?: boolean; sms?: boolean; marketingEmails?: boolean };
  }>(
    '/preferences',
    {
      preHandler: authenticate,
      schema: updatePreferencesBodySchema,
    },
    catchAsync(updatePreferences)
  );

  app.patch<{
    Body: { pushTokenUpdate?: { pushToken?: string | null } };
  }>(
    '/push-token',
    {
      preHandler: authenticate,
      schema: updatePushTokenBodySchema,
    },
    catchAsync(updatePushToken)
  );
}
