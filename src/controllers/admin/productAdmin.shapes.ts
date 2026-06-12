import { leanIdToString } from '../../utils/leanId';

function shapePopulatedRef(ref: unknown): { id: string; fields: Record<string, unknown> } {
  if (ref == null) return { id: '', fields: {} };

  if (typeof ref === 'object' && ref !== null && '_id' in ref) {
    const doc = ref as Record<string, unknown>;
    return { id: leanIdToString(doc._id), fields: doc };
  }

  return { id: leanIdToString(ref), fields: {} };
}

export function shapeProductItem(raw: Record<string, unknown>): Record<string, unknown> {
  const vendorRef = shapePopulatedRef(raw.vendor);
  const category = raw.category;
  const subCategory = raw.subCategory;

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    name: raw.name,
    slug: raw.slug,
    vendor: vendorRef.id || raw.vendor,
    vendorName: vendorRef.fields.storeName ?? vendorRef.fields.name,
    vendorSlug: vendorRef.fields.slug,
    description: raw.description,
    category: category,
    subCategory: subCategory,
    tags: raw.tags,
    price: raw.price,
    images: raw.images ?? [],
    inStock: raw.inStock,
    sku: raw.sku,
    inventoryMode: raw.inventoryMode,
    status: raw.status,
    isFeatured: raw.isFeatured,
    displayOrder: raw.displayOrder ?? 0,
    variationOptions: raw.variationOptions,
    variants: raw.variants,
    rejectionReason: raw.rejectionReason,
    rejectedAt: raw.rejectedAt,
    approvedAt: raw.approvedAt,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}
