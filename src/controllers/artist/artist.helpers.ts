/**
 * Artist dashboard helpers: population selectors and response shaping.
 * Use these to keep artist summary and serialization consistent across
 * music/video list and single-item responses.
 */

import { leanIdToString } from '../../utils/leanId';
import type { AccountStatus } from '../../lib/types/constants';
import type { ProfileStatus } from '../../lib/types/roleProfile';
import { UNKNOWN_PUBLIC_DISPLAY_NAME } from '../../lib/types/roleProfile';
import { isPubliclyVisible } from '../../services/profileVisibility';

export { leanIdToString };

/** Fields to populate for artist ref: summary only (list/single item). */
export const ARTIST_POPULATE_SELECT = '_id name slug image profileStatus isActive';

export const artistPublicPopulate = {
  path: 'artist' as const,
  select: `${ARTIST_POPULATE_SELECT} user`,
  populate: { path: 'user', select: 'accountStatus' },
};

/** Shape of populated artist in music/video responses (PopulatedArtistSummary). */
export interface ArtistSummary {
  _id: string;
  name: string;
  slug: string;
  image: string;
  linkable?: boolean;
}

/** Populated artist doc from Mongoose .populate(); used by toArtistSummary. */
export type PopulatedArtistDoc = {
  _id: unknown;
  name?: string;
  slug?: string;
  image?: string;
  profileStatus?: ProfileStatus;
  isActive?: boolean;
  user?: { accountStatus?: AccountStatus } | null;
};

function ownerFromPopulatedArtist(
  artist: PopulatedArtistDoc
): { accountStatus?: AccountStatus } | undefined {
  const user = artist.user;
  if (user && typeof user === 'object' && 'accountStatus' in user) {
    return { accountStatus: (user as { accountStatus?: AccountStatus }).accountStatus };
  }
  return undefined;
}

/**
 * Normalize a populated artist (from Mongoose .populate() or lean doc) to the
 * standard ArtistSummary shape. Handles ObjectId/string _id and missing fields.
 */
export function toArtistSummary(
  artist: PopulatedArtistDoc | null | undefined,
  ownerOverride?: { accountStatus?: AccountStatus }
): ArtistSummary | undefined {
  if (!artist || artist._id == null) return undefined;

  const owner = ownerOverride ?? ownerFromPopulatedArtist(artist);
  const visible = isPubliclyVisible('artist', artist, owner);

  if (!visible) {
    return {
      _id: leanIdToString(artist._id),
      name: UNKNOWN_PUBLIC_DISPLAY_NAME,
      slug: '',
      image: artist.image ?? '',
      linkable: false,
    };
  }

  return {
    _id: leanIdToString(artist._id),
    name: artist.name ?? '',
    slug: artist.slug ?? '',
    image: artist.image ?? '',
    linkable: true,
  };
}

/**
 * Serialize a lean document for API: ensures _id and nested ids are strings.
 * Use for artist profile (me) and for single music/video where we already have
 * the doc; for list items use the specific shape with toArtistSummary(artist).
 */
export function serializeDocIds<T extends Record<string, unknown>>(doc: T): T {
  if (!doc || typeof doc !== 'object') return doc;
  const out = { ...doc } as unknown as Record<string, unknown>;
  if (out._id != null) out._id = leanIdToString(out._id);
  if (out.user != null && typeof out.user !== 'string') {
    out.user = leanIdToString(out.user);
  }
  if (out.artist != null && typeof out.artist === 'object' && !Array.isArray(out.artist)) {
    out.artist = toArtistSummary(out.artist as PopulatedArtistDoc);
  }

  for (const key of ['statusChangedBy', 'approvedBy', 'rejectedBy'] as const) {
    if (out[key] != null && typeof out[key] !== 'string') {
      out[key] = leanIdToString(out[key]);
    }
  }

  for (const key of [
    'createdAt',
    'updatedAt',
    'approvedAt',
    'rejectedAt',
    'statusChangedAt',
  ] as const) {
    const value = out[key];
    if (value instanceof Date) out[key] = value.toISOString();
  }

  return out as T;
}
