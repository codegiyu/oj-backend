/* eslint-disable @typescript-eslint/require-await */
import type { FastifyInstance } from 'fastify';
import { authenticate, requireConsoleAccess } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import { getAdminMe, updateAdminMe } from '../controllers/admin/adminMe.controller';
import { adminUpdateMeBodySchema } from '../controllers/admin/adminMe.validation';

export async function registerAdminProfileRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', { preHandler: [authenticate, requireConsoleAccess] }, catchAsync(getAdminMe));
  app.patch<{
    Body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      avatar?: string;
    };
  }>(
    '/me',
    { preHandler: [authenticate, requireConsoleAccess], schema: adminUpdateMeBodySchema },
    catchAsync(updateAdminMe)
  );
}
