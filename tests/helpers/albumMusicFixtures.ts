import mongoose from 'mongoose';

/** Stable ids shared across album ↔ music unit tests (align with frontend phase tests where possible). */
export const MOCK_ALBUM_IDS = {
  primary: '507f1f77bcf86cd799439011',
} as const;

export const MOCK_ARTIST_IDS = {
  /** Album owner / matching track artist */
  primary: '507f1f77bcf86cd799439012',
  /** Different artist for mismatch scenarios */
  alternate: '507f1f77bcf86cd799439013',
} as const;

export const MOCK_TRACK_IDS = {
  primary: '507f1f77bcf86cd799439014',
} as const;

/** Populated artist summary shape (admin/public API). */
export const mockArtistSummary = {
  _id: MOCK_ARTIST_IDS.primary,
  name: 'Artist',
  slug: 'artist-slug',
  image: '',
  linkable: true,
} as const;

export const mockAlternateArtistSummary = {
  _id: MOCK_ARTIST_IDS.alternate,
  name: 'Other Artist',
  slug: 'other-artist',
  image: '',
} as const;

/** Populated album summary shape (admin/public API). */
export const mockAlbumSummary = {
  _id: MOCK_ALBUM_IDS.primary,
  title: 'Greatest Hits',
  slug: 'greatest-hits',
} as const;

export function toObjectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}

/** Lean album row returned by `Album.findById(...).select('_id artist').lean()`. */
export function mockAlbumAssignmentLean(input: {
  albumId?: string;
  artistId: string | mongoose.Types.ObjectId;
}) {
  const albumId = input.albumId ?? MOCK_ALBUM_IDS.primary;
  const artist =
    input.artistId instanceof mongoose.Types.ObjectId ? input.artistId : toObjectId(input.artistId);

  return {
    _id: albumId,
    title: mockAlbumSummary.title,
    slug: mockAlbumSummary.slug,
    status: 'published' as const,
    artist,
  };
}

/** Minimal music row fields useful when album assignment tests grow. */
export function mockMusicTrackRow(input?: { artistId?: string; albumId?: string | null }) {
  return {
    _id: MOCK_TRACK_IDS.primary,
    title: 'Track One',
    slug: 'track-one',
    status: 'published' as const,
    artist: input?.artistId ? toObjectId(input.artistId) : toObjectId(MOCK_ARTIST_IDS.primary),
    album: input?.albumId ? toObjectId(input.albumId) : null,
  };
}
