import type { Permission } from '../lib/types/constants';

export const ADMIN_PERMISSION_SLUGS = [
  'admin.content.read',
  'admin.content.write',
  'admin.content.delete',
  'admin.content.moderate',
  'admin.users.manage',
  'admin.staff.manage',
  'admin.settings.manage',
  'admin.system.read',
] as const;

export type AdminPermissionSlug = (typeof ADMIN_PERMISSION_SLUGS)[number];

const PERMISSION_LABELS: Record<
  AdminPermissionSlug,
  { name: string; description: string; isRestricted?: boolean }
> = {
  'admin.content.read': {
    name: 'View content',
    description: 'List and view admin content records',
  },
  'admin.content.write': {
    name: 'Edit content',
    description: 'Create and update admin content records',
  },
  'admin.content.delete': {
    name: 'Delete content',
    description: 'Delete admin content records',
    isRestricted: true,
  },
  'admin.content.moderate': {
    name: 'Moderate content',
    description: 'Approve, reject, suspend, and manage moderation workflows',
    isRestricted: true,
  },
  'admin.users.manage': {
    name: 'Manage users',
    description: 'View and manage platform user accounts',
    isRestricted: true,
  },
  'admin.staff.manage': {
    name: 'Manage staff',
    description: 'Invite and manage admin staff accounts',
    isRestricted: true,
  },
  'admin.settings.manage': {
    name: 'Manage settings',
    description: 'Update site settings and configuration',
    isRestricted: true,
  },
  'admin.system.read': {
    name: 'View system logs',
    description: 'View email logs, documents, and contact submissions',
  },
};

export const ADMIN_PERMISSIONS: Permission[] = ADMIN_PERMISSION_SLUGS.map(slug => ({
  slug,
  ...PERMISSION_LABELS[slug],
}));

export const SUPER_ADMIN_ROLE_SLUG = 'super-admin' as const;

/** Default permissions for the standard admin role (no staff or settings). */
export const DEFAULT_ADMIN_ROLE_PERMISSIONS: AdminPermissionSlug[] = [
  'admin.content.read',
  'admin.content.write',
  'admin.content.delete',
  'admin.content.moderate',
  'admin.users.manage',
  'admin.system.read',
];
