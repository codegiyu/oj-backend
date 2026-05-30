import type { ModelProduct } from '../lib/types/constants';

export type ProductVariantRow = {
  sku?: string;
  price: number;
  inStock: boolean;
  options: Record<string, string>;
};

export function findVariantBySku(
  product: Pick<ModelProduct, 'variants'> | { variants?: ModelProduct['variants'] },
  sku: string | undefined
): ProductVariantRow | null {
  const variants = product.variants;
  if (!variants?.length || !sku || String(sku).trim() === '') {
    return null;
  }

  const skuUpper = String(sku).toUpperCase();
  const variant = variants.find(v => (v.sku ?? '').toUpperCase() === skuUpper);

  return variant
    ? {
        sku: variant.sku ?? skuUpper,
        price: variant.price,
        inStock: variant.inStock,
        options: variant.options,
      }
    : null;
}

export function resolveProductLinePrice(
  product: { price?: number; variants?: ModelProduct['variants'] },
  sku?: string
): number {
  const basePrice = Number(product.price ?? 0);
  const variant = findVariantBySku(product, sku);

  return variant ? variant.price : basePrice;
}

export function assertProductAvailableForCart(
  product: Pick<ModelProduct, 'variants' | 'inStock'>,
  sku?: string
): void {
  if (product.variants?.length) {
    if (!sku || String(sku).trim() === '') {
      throw new Error('sku is required for variant products');
    }

    const variant = findVariantBySku(product, sku);
    if (!variant) {
      throw new Error(`No variant with sku "${sku}" found`);
    }
    if (!variant.inStock) {
      throw new Error(`Variant ${sku} is not in stock`);
    }

    return;
  }

  if (product.inStock === false) {
    throw new Error('Product is not in stock');
  }
}

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export const ORDER_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];
