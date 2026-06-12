import type { CacheKey } from './cache';
import { clearNamespace, getFromCacheOrDB, removeFromCache } from './cache';

export const RELATED_PRODUCTS_CACHE_TTL_SECONDS = 6 * 60 * 60;

export function relatedProductsCacheKey(productId: string, limit: number): CacheKey {
  return `vol:marketplace:related:${productId}:${limit}` as CacheKey;
}

export async function getCachedRelatedProductIds(
  productId: string,
  limit: number,
  load: () => Promise<string[]>
): Promise<string[]> {
  const key = relatedProductsCacheKey(productId, limit);
  const cached = await getFromCacheOrDB<string[]>(key, load, RELATED_PRODUCTS_CACHE_TTL_SECONDS);

  return cached ?? [];
}

export async function invalidateRelatedProductsCache(productId: string): Promise<void> {
  await clearNamespace(`vol:marketplace:related:${productId}:`);
}

export async function invalidateRelatedProductsCacheKey(
  productId: string,
  limit: number
): Promise<void> {
  await removeFromCache(relatedProductsCacheKey(productId, limit));
}
