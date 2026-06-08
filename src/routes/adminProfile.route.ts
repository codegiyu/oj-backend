/* eslint-disable @typescript-eslint/require-await */
import type { FastifyInstance } from 'fastify';
import { catchAsync } from '../utils/catchAsync';
import { getAdminMe, updateAdminMe } from '../controllers/admin/adminMe.controller';
import { adminUpdateMeBodySchema } from '../controllers/admin/adminMe.validation';
import { adminProfileRoute } from '../utils/adminRouteHandlers';

export async function registerAdminProfileRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', adminProfileRoute, catchAsync(getAdminMe));
  app.patch<{
    Body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      avatar?: string;
    };
  }>('/me', { ...adminProfileRoute, schema: adminUpdateMeBodySchema }, catchAsync(updateAdminMe));
}
