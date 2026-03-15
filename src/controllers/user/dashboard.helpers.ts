/**
 * Account dashboard helpers: standardize populations and response shapes for
 * GET/PATCH /user/me, wishlist list/add, and consistent serialization (IDs and dates as strings).
 */

type LeanDoc = Record<string, unknown>;

/**
 * Serialize a populated user for IUserMeRes (GET /user/me, PATCH /user/me, change-password).
 * Ensures _id, createdAt, updatedAt and nested artist._id, vendor._id are strings.
 */
export function serializePopulatedUser(payload: LeanDoc): LeanDoc {
  const out = { ...payload } as LeanDoc;
  if (out._id != null) out._id = String(out._id);
  ['createdAt', 'updatedAt'].forEach(key => {
    if (out[key] instanceof Date) out[key] = (out[key] as Date).toISOString();
  });
  const artist = out.artist as LeanDoc | undefined;
  if (artist && typeof artist === 'object' && artist._id != null) {
    out.artist = {
      ...artist,
      _id: String(artist._id),
    };
  }
  const vendor = out.vendor as LeanDoc | undefined;
  if (vendor && typeof vendor === 'object' && vendor._id != null) {
    out.vendor = {
      ...vendor,
      _id: String(vendor._id),
    };
  }
  return out;
}

/** Product summary for wishlist: full display fields + images[]. */
export interface WishlistProductSummary {
  _id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  vendor?: { name: string; slug: string };
}

/** Wishlist item shape (IUserWishlistItem): _id, createdAt, product. */
export interface WishlistItemShape {
  _id: string;
  createdAt: string;
  product: WishlistProductSummary;
}

type PopulatedProduct = LeanDoc & {
  _id?: unknown;
  name?: string;
  slug?: string;
  price?: number;
  images?: string[];
  vendor?: LeanDoc & { _id?: unknown; name?: string; slug?: string; storeName?: string };
};

/**
 * Shape a single wishlist document (from find or findOneAndUpdate) to IUserWishlistItem.
 * Use for both GET /user/wishlist list and POST /user/wishlist response.
 */
export function shapeWishlistItem(item: {
  _id: unknown;
  createdAt?: unknown;
  product?: PopulatedProduct | null | unknown;
}): WishlistItemShape {
  const product = (item.product as PopulatedProduct | null | undefined) ?? undefined;
  const vendor = product?.vendor;
  const vendorName =
    vendor && typeof vendor === 'object'
      ? (vendor.storeName ?? vendor.name ?? '')
      : '';

  const vendorSlug =
    vendor && typeof vendor === 'object' && (vendor as { slug?: string }).slug != null
      ? String((vendor as { slug?: string }).slug)
      : '';

  return {
    _id: item._id != null ? String(item._id) : '',
    createdAt:
      item.createdAt instanceof Date
        ? item.createdAt.toISOString()
        : typeof item.createdAt === 'string'
          ? item.createdAt
          : '',
    product: {
      _id: product?._id != null ? String(product._id) : '',
      name: product?.name ?? '',
      slug: product?.slug ?? '',
      price: typeof product?.price === 'number' ? product.price : 0,
      images: Array.isArray(product?.images) ? product.images : [],
      ...(vendorName || vendorSlug
        ? {
            vendor: {
              name: vendorName,
              slug: vendorSlug,
            },
          }
        : {}),
    },
  };
}
