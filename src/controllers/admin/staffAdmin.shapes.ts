import { leanIdToString } from './admin.helpers';
import { ACCOUNT_STATUSES } from '../../lib/types/constants';

function isoDate(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value) return value;
  return undefined;
}

export function applyStaffListStatusFilter(
  filter: Record<string, unknown>,
  status: string | undefined
): void {
  if (!status || status === 'all') return;

  if ((ACCOUNT_STATUSES as readonly string[]).includes(status)) {
    filter.accountStatus = status;
  }
}

export function shapeStaffListItem(raw: Record<string, unknown>): Record<string, unknown> {
  const auth = raw.auth as { roles?: { slug?: string }[]; lastLogin?: unknown } | undefined;
  const roleSlugs = (auth?.roles ?? []).map(r => r.slug).filter(Boolean);

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    firstName: raw.firstName ?? '',
    lastName: raw.lastName ?? '',
    email: raw.email ?? '',
    avatar: raw.avatar ?? '',
    accountStatus: raw.accountStatus ?? 'unverified',
    roleSlugs,
    primaryRoleSlug: roleSlugs[0] ?? '',
    createdAt: isoDate(raw.createdAt),
    updatedAt: isoDate(raw.updatedAt),
    lastLogin: isoDate(auth?.lastLogin),
  };
}

export function shapeStaffDetail(raw: Record<string, unknown>): Record<string, unknown> {
  const auth = raw.auth as
    | {
        roles?: { slug?: string; roleId?: unknown }[];
        permissions?: { slug?: string; name?: string }[];
        lastLogin?: unknown;
      }
    | undefined;

  const roleSlugs = (auth?.roles ?? []).map(r => r.slug).filter(Boolean);
  const permissions = (auth?.permissions ?? []).map(p => ({
    slug: p.slug ?? '',
    name: p.name ?? p.slug ?? '',
  }));

  return {
    ...shapeStaffListItem(raw),
    permissions,
    roleSlugs,
  };
}
