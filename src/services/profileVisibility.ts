import type { AccountStatus } from '../lib/types/constants';
import type { ProfileStatus, RoleProfileType } from '../lib/types/roleProfile';
import { UNKNOWN_PUBLIC_DISPLAY_NAME } from '../lib/types/roleProfile';

export type OwnerUserSnapshot = { accountStatus?: AccountStatus } | null | undefined;

export type VendorStatusSnapshot = { status?: string } | null | undefined;

export type ProfileStatusSnapshot =
  | { profileStatus?: ProfileStatus; isActive?: boolean }
  | null
  | undefined;

export function isVendorRoleActive(status: string | undefined): boolean {
  return status === 'active';
}

export function isArtistOrPastorRoleActive(profile: ProfileStatusSnapshot): boolean {
  if (!profile) return false;
  if (profile.profileStatus) return profile.profileStatus === 'active';
  return profile.isActive !== false;
}

export function isRoleProfileActive(
  profileType: RoleProfileType,
  profile: VendorStatusSnapshot & ProfileStatusSnapshot
): boolean {
  if (!profile) return false;
  if (profileType === 'vendor') return isVendorRoleActive(profile.status);
  return isArtistOrPastorRoleActive(profile);
}

export function isPubliclyVisible(
  profileType: RoleProfileType,
  profile: VendorStatusSnapshot & ProfileStatusSnapshot,
  ownerUser?: OwnerUserSnapshot
): boolean {
  if (!profile) return false;
  if (ownerUser?.accountStatus === 'suspended') return false;
  return isRoleProfileActive(profileType, profile);
}

export type PublicAttribution = {
  displayName: string;
  linkable: boolean;
  _id?: string;
  slug?: string;
  image?: string;
};

export function toPublicArtistAttribution(
  artist:
    | {
        _id?: string;
        name?: string;
        slug?: string;
        image?: string;
        profileStatus?: ProfileStatus;
        isActive?: boolean;
      }
    | null
    | undefined,
  ownerUser?: OwnerUserSnapshot
): PublicAttribution | undefined {
  if (!artist?._id) return undefined;

  if (!isPubliclyVisible('artist', artist, ownerUser)) {
    return { displayName: UNKNOWN_PUBLIC_DISPLAY_NAME, linkable: false };
  }

  return {
    _id: String(artist._id),
    displayName: artist.name ?? '',
    slug: artist.slug ?? '',
    image: artist.image ?? '',
    linkable: true,
  };
}

export function toPublicArtistSummaryShape(
  artist:
    | {
        _id: unknown;
        name?: string;
        slug?: string;
        image?: string;
        profileStatus?: ProfileStatus;
        isActive?: boolean;
      }
    | null
    | undefined,
  ownerUser?: OwnerUserSnapshot
): { _id: string; name: string; slug: string; image: string; linkable: boolean } | undefined {
  const attr = toPublicArtistAttribution(
    artist
      ? {
          _id: String(artist._id),
          name: artist.name,
          slug: artist.slug,
          image: artist.image,
          profileStatus: artist.profileStatus,
          isActive: artist.isActive,
        }
      : undefined,
    ownerUser
  );
  if (!attr) return undefined;

  return {
    _id: attr._id ?? '',
    name: attr.displayName,
    slug: attr.linkable ? (attr.slug ?? '') : '',
    image: attr.image ?? '',
    linkable: attr.linkable,
  };
}
