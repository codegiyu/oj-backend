import type { preHandlerAsyncHookHandler } from 'fastify';
import type { AdminPermissionSlug } from '../constants/adminPermissions';
import {
  authenticatePreHandler,
  requireAdminPermissionPreHandler,
  requireConsoleAccessPreHandler,
} from '../middleware/auth.middleware';

export function adminRoutePreHandlers(
  ...permissions: AdminPermissionSlug[]
): preHandlerAsyncHookHandler[] {
  return [
    authenticatePreHandler,
    requireConsoleAccessPreHandler,
    requireAdminPermissionPreHandler(...permissions),
  ];
}

export const adminReadRoute = {
  preHandler: adminRoutePreHandlers('admin.content.read'),
};

export const adminWriteRoute = {
  preHandler: adminRoutePreHandlers('admin.content.write'),
};

export const adminDeleteRoute = {
  preHandler: adminRoutePreHandlers('admin.content.delete'),
};

export const adminModerateRoute = {
  preHandler: adminRoutePreHandlers('admin.content.moderate'),
};

export const adminUsersRoute = {
  preHandler: adminRoutePreHandlers('admin.users.manage'),
};

export const adminStaffRoute = {
  preHandler: adminRoutePreHandlers('admin.staff.manage'),
};

export const adminSettingsRoute = {
  preHandler: adminRoutePreHandlers('admin.settings.manage'),
};

export const adminSystemReadRoute = {
  preHandler: adminRoutePreHandlers('admin.system.read'),
};

/** Profile routes — any authenticated console admin may read/update self. */
export const adminProfileRoute = {
  preHandler: [authenticatePreHandler, requireConsoleAccessPreHandler],
};
