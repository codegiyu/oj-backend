/**
 * Artist dashboard helpers: population selectors and response shaping.
 * Use these to keep artist summary and serialization consistent across
 * music/video list and single-item responses.
 */

/** Fields to populate for artist ref: summary only (list/single item). */
export const ARTIST_POPULATE_SELECT = '_id name slug image';

/** Shape of populated artist in music/video responses (PopulatedArtistSummary). */
export interface ArtistSummary {
  _id: string;
  name: string;
  slug: string;
  image: string;
}

/** Populated artist doc from Mongoose .populate(); used by toArtistSummary. */
export type PopulatedArtistDoc = {
  _id: unknown;
  name?: string;
  slug?: string;
  image?: string;
};

/**
 * Normalize a populated artist (from Mongoose .populate() or lean doc) to the
 * standard ArtistSummary shape. Handles ObjectId/string _id and missing fields.
 */
export function toArtistSummary(artist: PopulatedArtistDoc | null | undefined): ArtistSummary | undefined {
  if (!artist || artist._id == null) return undefined;
  return {
    _id: String(artist._id),
    name: artist.name ?? '',
    slug: artist.slug ?? '',
    image: artist.image ?? '',
  };
}

/**
 * Serialize a lean document for API: ensures _id and nested ids are strings.
 * Use for artist profile (me) and for single music/video where we already have
 * the doc; for list items use the specific shape with toArtistSummary(artist).
 */
export function serializeDocIds<T extends Record<string, unknown>>(doc: T): T {
  if (!doc || typeof doc !== 'object') return doc;
  const out = { ...doc } as Record<string, unknown>;
  if (out._id != null) out._id = String(out._id);
  if (out.artist != null && typeof out.artist === 'object' && !Array.isArray(out.artist)) {
    out.artist = toArtistSummary(out.artist as PopulatedArtistDoc);
  }
  ['createdAt', 'updatedAt'].forEach(key => {
    if (out[key] instanceof Date) out[key] = (out[key] as Date).toISOString();
  });
  return out as T;
}
