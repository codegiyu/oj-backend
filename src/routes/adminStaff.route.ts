/* eslint-disable @typescript-eslint/require-await */
import type { FastifyInstance } from 'fastify';
import { authenticate, requireConsoleAccess } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import {
  getAdminStaff,
  inviteAdminStaff,
  listAdminStaff,
  reinviteAdminStaff,
} from '../controllers/admin/staffAdmin.controller';
import {
  adminStaffIdParamSchema,
  adminStaffInviteBodySchema,
  adminStaffListQuerystringSchema,
} from '../controllers/admin/staffAdmin.validation';

const opts = { preHandler: [authenticate, requireConsoleAccess] };

export async function registerAdminStaffRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/staff',
    { ...opts, schema: adminStaffListQuerystringSchema },
    catchAsync(listAdminStaff)
  );
  app.post(
    '/staff/invite',
    { ...opts, schema: adminStaffInviteBodySchema },
    catchAsync(inviteAdminStaff)
  );
  app.get('/staff/:id', { ...opts, schema: adminStaffIdParamSchema }, catchAsync(getAdminStaff));
  app.post(
    '/staff/:id/reinvite',
    { ...opts, schema: adminStaffIdParamSchema },
    catchAsync(reinviteAdminStaff)
  );
}
