/* eslint-disable @typescript-eslint/require-await */
import type { FastifyInstance } from 'fastify';
import { catchAsync } from '../utils/catchAsync';
import {
  getAdminStaff,
  inviteAdminStaff,
  listAdminStaff,
  reinviteAdminStaff,
} from '../controllers/admin/staffAdmin.controller';
import { adminStaffRoute } from '../utils/adminRouteHandlers';
import {
  adminStaffIdParamSchema,
  adminStaffInviteBodySchema,
  adminStaffListQuerystringSchema,
} from '../controllers/admin/staffAdmin.validation';

export async function registerAdminStaffRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/staff',
    { ...adminStaffRoute, schema: adminStaffListQuerystringSchema },
    catchAsync(listAdminStaff)
  );
  app.post(
    '/staff/invite',
    { ...adminStaffRoute, schema: adminStaffInviteBodySchema },
    catchAsync(inviteAdminStaff)
  );
  app.get(
    '/staff/:id',
    { ...adminStaffRoute, schema: adminStaffIdParamSchema },
    catchAsync(getAdminStaff)
  );
  app.post(
    '/staff/:id/reinvite',
    { ...adminStaffRoute, schema: adminStaffIdParamSchema },
    catchAsync(reinviteAdminStaff)
  );
}
