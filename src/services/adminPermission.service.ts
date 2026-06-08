import { Admin } from '../models/admin';
import {
  ADMIN_PERMISSIONS,
  DEFAULT_ADMIN_ROLE_PERMISSIONS,
  SUPER_ADMIN_ROLE_SLUG,
  type AdminPermissionSlug,
} from '../constants/adminPermissions';

export async function isSuperAdminUser(userId: string): Promise<boolean> {
  const admin = await Admin.findById(userId).select('auth.roles').lean();

  return Boolean(admin?.auth?.roles?.some(role => role.slug === SUPER_ADMIN_ROLE_SLUG));
}

export async function getAdminPermissionSlugs(userId: string): Promise<Set<string>> {
  const admin = await Admin.findById(userId).select('auth.permissions auth.roles').lean();

  if (!admin) {
    return new Set();
  }

  if (admin.auth?.roles?.some(role => role.slug === SUPER_ADMIN_ROLE_SLUG)) {
    return new Set(ADMIN_PERMISSIONS.map(permission => permission.slug));
  }

  const slugs = (admin.auth?.permissions ?? []).map(permission => permission.slug);

  return new Set(slugs);
}

export async function adminHasRequiredPermissions(
  userId: string,
  requiredSlugs: AdminPermissionSlug[]
): Promise<boolean> {
  if (requiredSlugs.length === 0) {
    return true;
  }

  if (await isSuperAdminUser(userId)) {
    return true;
  }

  const granted = await getAdminPermissionSlugs(userId);

  return requiredSlugs.some(slug => granted.has(slug));
}

export function permissionsForRoleSlug(roleSlug: string): AdminPermissionSlug[] {
  if (roleSlug === SUPER_ADMIN_ROLE_SLUG) {
    return ADMIN_PERMISSIONS.map(permission => permission.slug as AdminPermissionSlug);
  }

  if (roleSlug === 'admin') {
    return [...DEFAULT_ADMIN_ROLE_PERMISSIONS];
  }

  return [];
}
