import { Artist } from '../../models/artist';
import { findByIdOrSlug } from './shared';

const activeArtistFilter = {
  profileStatus: 'active',
  isActive: true,
} as const;

export async function countActiveCommunityArtists(): Promise<number> {
  return Artist.countDocuments(activeArtistFilter);
}

export async function listActiveCommunityArtists(options: {
  skip: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const filter = activeArtistFilter;
  const [items, total] = await Promise.all([
    Artist.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    Artist.countDocuments(filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}

export async function findActiveArtistByIdOrSlug(
  idOrSlug: string
): Promise<Record<string, unknown> | null> {
  return findByIdOrSlug(Artist, idOrSlug, activeArtistFilter);
}
