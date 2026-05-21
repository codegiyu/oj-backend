/** Hard cap for public catalog-style lists (categories, home adverts). */
export const PUBLIC_CATALOG_MAX_ITEMS = 100;

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
