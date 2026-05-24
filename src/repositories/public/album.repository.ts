import { Album } from '../../models/album';
import { ARTIST_POPULATE_SELECT } from '../../controllers/artist/artist.helpers';
import { findByIdOrSlug } from '../community/shared';
import { findByIdLean } from '../admin/paginatedList.repository';

export async function listPublishedAlbums(options: {
  filter: Record<string, unknown>;
  sort: Record<string, 1 | -1>;
  skip: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const [items, total] = await Promise.all([
    Album.find(options.filter)
      .sort(options.sort)
      .populate('artist', ARTIST_POPULATE_SELECT)
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    Album.countDocuments(options.filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}

export async function findPublishedAlbumByIdOrSlug(
  idOrSlug: string
): Promise<Record<string, unknown> | null> {
  return findByIdOrSlug(Album, idOrSlug, { status: 'published' });
}

export async function findPublishedAlbumByIdPopulated(
  id: unknown
): Promise<Record<string, unknown> | null> {
  return findByIdLean(Album, String(id), { path: 'artist', select: ARTIST_POPULATE_SELECT });
}
