export type ArtistPublicListScope = 'directory' | 'rising' | 'featured' | 'spotlight';

const NON_EMPTY = /\S/;

/** Minimum profile fields required for spotlight list cards. */
export function artistSpotlightCompletenessFilter(): Record<string, unknown> {
  return {
    name: { $regex: NON_EMPTY },
    slug: { $regex: NON_EMPTY },
    image: { $regex: NON_EMPTY },
  };
}

export function resolveArtistListScope(query: {
  rising?: string;
  featured?: string;
  spotlight?: string;
}): ArtistPublicListScope {
  if (query.rising === 'true') return 'rising';
  if (query.featured === 'true') return 'featured';
  if (query.spotlight === 'true') return 'spotlight';

  return 'directory';
}

export function artistScopeFilterAndSort(scope: ArtistPublicListScope): {
  filter: Record<string, unknown>;
  sort: Record<string, 1 | -1>;
} {
  switch (scope) {
    case 'rising':
      return {
        filter: { isRising: true, ...artistSpotlightCompletenessFilter() },
        sort: { risingArtistDisplayOrder: 1, createdAt: -1 },
      };
    case 'featured':
      return {
        filter: { isMusicFeatured: true, ...artistSpotlightCompletenessFilter() },
        sort: { musicFeaturedDisplayOrder: 1, createdAt: -1 },
      };
    case 'spotlight':
      return {
        filter: { isCreatorSpotlight: true, ...artistSpotlightCompletenessFilter() },
        sort: { creatorSpotlightDisplayOrder: 1, createdAt: -1 },
      };
    default:
      return {
        filter: {},
        sort: { displayOrder: 1, createdAt: -1 },
      };
  }
}
