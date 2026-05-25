import { leanIdToString } from './admin.helpers';
import { ACCOUNT_STATUSES } from '../../lib/types/constants';

function isoDate(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value) return value;
  return undefined;
}

function linkedProfileName(
  ref: unknown,
  field: 'name' | 'storeName'
): { id?: string; label?: string } {
  if (ref == null) return {};
  if (typeof ref === 'object' && ref !== null && '_id' in ref) {
    const doc = ref as { _id: unknown; name?: string; storeName?: string };
    const label = field === 'storeName' ? doc.storeName || doc.name : doc.name;
    return {
      id: leanIdToString(doc._id),
      ...(label ? { label } : {}),
    };
  }

  return { id: leanIdToString(ref) };
}

export function applyUserListStatusFilter(
  filter: Record<string, unknown>,
  status: string | undefined
): void {
  delete filter.status;
  if (!status) return;

  if (status === 'deletion-pending') {
    filter.deleteRequestedAt = { $exists: true, $ne: null };
    return;
  }

  if ((ACCOUNT_STATUSES as readonly string[]).includes(status)) {
    filter.accountStatus = status;
  }
}

export function shapeUserListItem(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = linkedProfileName(raw.artistId, 'name');
  const vendor = linkedProfileName(raw.vendorId, 'storeName');
  const auth = raw.auth as { lastLogin?: unknown } | undefined;

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    firstName: raw.firstName ?? '',
    lastName: raw.lastName ?? '',
    email: raw.email ?? '',
    avatar: raw.avatar ?? '',
    accountStatus: raw.accountStatus ?? 'unverified',
    ...(artist.id ? { artistId: artist.id, linkedArtistName: artist.label ?? '' } : {}),
    ...(vendor.id ? { vendorId: vendor.id, linkedVendorName: vendor.label ?? '' } : {}),
    ...(raw.deleteRequestedAt != null ? { deleteRequestedAt: isoDate(raw.deleteRequestedAt) } : {}),
    createdAt: isoDate(raw.createdAt),
    ...(auth?.lastLogin != null ? { lastLogin: isoDate(auth.lastLogin) } : {}),
  };
}

export function shapeUserDetail(raw: Record<string, unknown>): Record<string, unknown> {
  const listFields = shapeUserListItem(raw);
  const auth = raw.auth as { roles?: { slug?: string }[]; lastLogin?: unknown } | undefined;
  const kyc = raw.kyc as
    | {
        email?: { isVerified?: boolean };
        phoneNumber?: { isVerified?: boolean };
      }
    | undefined;
  const artist = linkedProfileName(raw.artistId, 'name');
  const vendor = linkedProfileName(raw.vendorId, 'storeName');
  const approvedBy = raw.deletionApprovedBy as
    | { _id?: unknown; firstName?: string; lastName?: string; email?: string }
    | undefined;

  const roleSlugs = (auth?.roles ?? [])
    .map(role => role.slug)
    .filter((slug): slug is string => typeof slug === 'string' && slug.length > 0);

  return {
    ...listFields,
    middleName: raw.middleName ?? '',
    title: raw.title ?? '',
    gender: raw.gender ?? '',
    phoneNumber: raw.phoneNumber ?? '',
    roleSlugs,
    kycEmailVerified: kyc?.email?.isVerified === true,
    kycPhoneVerified: kyc?.phoneNumber?.isVerified === true,
    updatedAt: isoDate(raw.updatedAt),
    ...(artist.id && artist.label ? { linkedArtist: { _id: artist.id, name: artist.label } } : {}),
    ...(vendor.id && vendor.label
      ? { linkedVendor: { _id: vendor.id, storeName: vendor.label } }
      : {}),
    ...(raw.deletionApprovedAt != null
      ? { deletionApprovedAt: isoDate(raw.deletionApprovedAt) }
      : {}),
    ...(approvedBy?._id != null
      ? {
          deletionApprovedBy: {
            _id: leanIdToString(approvedBy._id),
            firstName: approvedBy.firstName ?? '',
            lastName: approvedBy.lastName ?? '',
            email: approvedBy.email ?? '',
          },
        }
      : {}),
  };
}
