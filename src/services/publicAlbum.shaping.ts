import { toArtistSummary } from '../controllers/artist/artist.helpers';
import { leanIdToString } from '../utils/leanId';

export function shapeAlbumListItem(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(
    raw.artist as { _id: unknown; name?: string; slug?: string; image?: string } | null
  );

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    coverImage: raw.coverImage ?? '',
    excerpt: raw.excerpt ?? '',
    description: raw.description ?? '',
    releaseDate:
      raw.releaseDate instanceof Date ? raw.releaseDate.toISOString() : (raw.releaseDate ?? null),
    status: raw.status,
    isFeatured: Boolean(raw.isFeatured),
    displayOrder: raw.displayOrder ?? 0,
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    trackCount: raw.trackCount ?? 0,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    ...(artist && { artist }),
  };
}

export function shapeAlbumDetail(raw: Record<string, unknown>): Record<string, unknown> {
  return shapeAlbumListItem(raw);
}

export function shapeAlbumTrackItem(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(
    raw.artist as { _id: unknown; name?: string; slug?: string; image?: string } | null
  );

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    coverImage: raw.coverImage ?? '',
    excerpt: raw.excerpt ?? '',
    displayOrder: raw.displayOrder ?? 0,
    plays: raw.plays ?? 0,
    ...(artist && { artist }),
  };
}
