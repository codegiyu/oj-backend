export const CONTENT_FAVORITE_ENTITY_TYPES = ['music', 'video', 'news', 'devotional'] as const;

export type ContentFavoriteEntityType = (typeof CONTENT_FAVORITE_ENTITY_TYPES)[number];

export function isContentFavoriteEntityType(value: string): value is ContentFavoriteEntityType {
  return (CONTENT_FAVORITE_ENTITY_TYPES as readonly string[]).includes(value);
}

export function contentFavoriteKey(
  entityType: ContentFavoriteEntityType,
  entityId: string
): string {
  return `${entityType}:${entityId}`;
}

export function buildContentFavoriteHref(
  entityType: ContentFavoriteEntityType,
  entityId: string,
  slug?: string
): string {
  const idOrSlug = slug?.trim() || entityId;

  switch (entityType) {
    case 'music':
      return `/music/${encodeURIComponent(idOrSlug)}`;
    case 'video':
      return `/videos/${encodeURIComponent(idOrSlug)}`;
    case 'news':
      return `/news/story/${encodeURIComponent(entityId)}`;
    case 'devotional':
      return `/community/devotionals/${encodeURIComponent(idOrSlug)}`;
    default:
      return '/';
  }
}
