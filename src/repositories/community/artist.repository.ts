import { Artist } from '../../models/artist';
import {
  artistScopeFilterAndSort,
  type ArtistPublicListScope,
} from '../../constants/artistSections';
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
  scope?: ArtistPublicListScope;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const scope = options.scope ?? 'directory';
  const { filter: scopeFilter, sort } = artistScopeFilterAndSort(scope);
  const filter = { ...activeArtistFilter, ...scopeFilter };

  const [items, total] = await Promise.all([
    Artist.find(filter).sort(sort).skip(options.skip).limit(options.limit).lean(),
    Artist.countDocuments(filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}

export async function findActiveArtistByIdOrSlug(
  idOrSlug: string
): Promise<Record<string, unknown> | null> {
  return findByIdOrSlug(Artist, idOrSlug, activeArtistFilter);
}
