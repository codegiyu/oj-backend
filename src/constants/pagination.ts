/** Hard cap for public catalog-style lists (categories, home adverts). */
export const PUBLIC_CATALOG_MAX_ITEMS = 100;

export const PUBLIC_LIST_DEFAULT_LIMIT = 12;
export const PUBLIC_LIST_MAX_LIMIT = 100;
export const FEATURED_TESTIMONIES_LIMIT = 6;
export const TRENDING_DEVOTIONALS_LIMIT = 6;
export const RELATED_DEVOTIONALS_LIMIT = 6;
export const RECENT_PRAYER_REQUESTS_LIMIT = 6;

export function clampPublicCatalogLimit(requested?: number): number {
  if (requested === undefined || !Number.isFinite(requested)) {
    return PUBLIC_CATALOG_MAX_ITEMS;
  }

  const normalized = Math.floor(requested);

  if (normalized <= 0) {
    return PUBLIC_CATALOG_MAX_ITEMS;
  }

  return Math.min(normalized, PUBLIC_CATALOG_MAX_ITEMS);
}
