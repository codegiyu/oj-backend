import mongoose from 'mongoose';
import * as marketplaceRepo from '../repositories/marketplace/marketplace.repository';
import { shapeMarketplaceProductRow } from '../utils/marketplaceProductShape';
import { rankRelatedProducts, type RelatedProductScoreInput } from './relatedProducts.service';
import { getCachedRelatedProductIds } from '../utils/relatedProductsCache';

const DEFAULT_RELATED_LIMIT = 8;
const CANDIDATE_POOL_LIMIT = 200;

function stringifyId(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toHexString();
  if (typeof value === 'object' && '_id' in value) {
    return stringifyId((value as { _id: unknown })._id);
  }

  return '';
}

function toObjectId(value: unknown): mongoose.Types.ObjectId | undefined {
  const id = stringifyId(value);
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return undefined;

  return new mongoose.Types.ObjectId(id);
}

function buildScoreInput(product: Record<string, unknown>): RelatedProductScoreInput {
  const category = product.category as
    | { _id?: unknown }
    | mongoose.Types.ObjectId
    | null
    | undefined;
  const subCategory = product.subCategory as
    | { _id?: unknown }
    | mongoose.Types.ObjectId
    | null
    | undefined;

  return {
    _id: toObjectId(product._id) ?? new mongoose.Types.ObjectId(),
    name: typeof product.name === 'string' ? product.name : '',
    price: typeof product.price === 'number' ? product.price : Number(product.price ?? 0),
    vendor: toObjectId(product.vendor),
    category:
      category && typeof category === 'object' && '_id' in category
        ? toObjectId(category._id)
        : toObjectId(category),
    subCategory:
      subCategory && typeof subCategory === 'object' && '_id' in subCategory
        ? toObjectId(subCategory._id)
        : toObjectId(subCategory),
    tags: Array.isArray(product.tags) ? product.tags.map(String) : [],
  };
}

export async function loadRelatedProductsForProduct(
  product: Record<string, unknown>,
  limit = DEFAULT_RELATED_LIMIT
): Promise<Record<string, unknown>[]> {
  const productId = stringifyId(product._id);
  if (!productId) return [];

  const source = buildScoreInput(product);
  const relatedIds = await getCachedRelatedProductIds(productId, limit, async () => {
    const candidates = await marketplaceRepo.findPublishedProductsForRelatedScoring({
      excludeProductId: source._id,
      categoryId: source.category,
      subCategoryId: source.subCategory,
      vendorId: source.vendor,
      limit: CANDIDATE_POOL_LIMIT,
    });

    return rankRelatedProducts(source, candidates, limit).map(candidate => String(candidate._id));
  });

  if (!relatedIds.length) return [];

  const objectIds = relatedIds
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));

  const rows = await marketplaceRepo.findPublishedProductsByIds(objectIds);
  const byId = new Map(rows.map(row => [String(row._id), row]));

  return relatedIds
    .map(id => byId.get(id))
    .filter((row): row is NonNullable<typeof row> => row != null)
    .map(row => shapeMarketplaceProductRow(row as unknown as Record<string, unknown>));
}

export { invalidateRelatedProductsCache } from '../utils/relatedProductsCache';
