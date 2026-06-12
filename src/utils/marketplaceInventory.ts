import type mongoose from 'mongoose';

/**
 * Legacy hook after checkout; unlimited inventory means stock is never depleted.
 */
export async function setBooleanInventoryAfterOrder(
  _orderItems: Array<{ product: mongoose.Types.ObjectId; sku?: string }>
): Promise<void> {
  // No-op: inventoryMode is unlimited for all products.
}
