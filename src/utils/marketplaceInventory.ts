import type mongoose from 'mongoose';
import { Product } from '../models/product';

/**
 * Adjust inventory after checkout. Unlimited products are unchanged; tracked products
 * decrement stockQuantity and flip inStock when depleted.
 */
export async function setBooleanInventoryAfterOrder(
  orderItems: Array<{ product: mongoose.Types.ObjectId; sku?: string; quantity: number }>,
  session?: mongoose.ClientSession
): Promise<void> {
  for (const item of orderItems) {
    const product = await Product.findById(item.product).session(session ?? null);
    if (!product || product.inventoryMode !== 'tracked') continue;

    const nextQuantity = Math.max(0, (product.stockQuantity ?? 0) - item.quantity);
    product.stockQuantity = nextQuantity;
    product.inStock = nextQuantity > 0;

    if (item.sku && product.variants?.length) {
      const variant = product.variants.find(v => v.sku === item.sku);
      if (variant) {
        variant.inStock = nextQuantity > 0;
      }
    }

    await product.save({ session: session ?? undefined });
  }
}
