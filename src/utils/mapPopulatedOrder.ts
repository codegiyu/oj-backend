import { Types } from 'mongoose';
import { leanIdToString } from './leanId';
import type {
  PopulatedOrder,
  PopulatedOrderProduct,
  PopulatedOrderVendor,
} from '../lib/types/constants';

function isPopulatedVendor(v: PopulatedOrder['vendor']): v is PopulatedOrderVendor {
  return v != null && typeof v === 'object' && !(v instanceof Types.ObjectId);
}

function isPopulatedProduct(
  p: PopulatedOrder['items'][number]['product']
): p is PopulatedOrderProduct {
  return p != null && typeof p === 'object' && !(p instanceof Types.ObjectId);
}

/**
 * Map a populated order to the API shape for list/detail responses.
 * Vendor summary: _id, name, slug, storeName.
 * items[].product: _id, name, slug, price, images, and derived image when applicable.
 * Top-level _id and date fields are serialized as strings / ISO strings.
 */
export function mapPopulatedOrderToApi(order: PopulatedOrder): Record<string, unknown> {
  const vendorDoc = isPopulatedVendor(order.vendor) ? order.vendor : undefined;
  const vendorIdStr =
    vendorDoc?._id != null
      ? leanIdToString(vendorDoc._id)
      : order.vendor instanceof Types.ObjectId
        ? order.vendor.toHexString()
        : undefined;
  const vendorSummary = {
    _id: vendorIdStr,
    name: vendorDoc?.name,
    slug: vendorDoc?.slug,
    storeName: vendorDoc?.storeName,
  };

  const items = (order.items || []).map(item => {
    const productDoc = item.product;
    const product =
      isPopulatedProduct(productDoc) && productDoc._id != null
        ? {
            _id: leanIdToString(productDoc._id),
            name: productDoc.name,
            slug: productDoc.slug,
            price: productDoc.price,
            images: Array.isArray(productDoc.images) ? productDoc.images : [],
            image: Array.isArray(productDoc.images) ? productDoc.images[0] : productDoc.image,
          }
        : {
            _id: item.product instanceof Types.ObjectId ? item.product.toHexString() : '',
            name: item.productName ?? '',
            slug: '',
            price: item.price,
            images: [] as string[],
            image: undefined,
          };

    return {
      product,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.totalPrice ?? (Number(item.quantity) || 0) * (Number(item.price) || 0),
      ...(item.sku != null ? { sku: item.sku } : {}),
      ...(item.selectedOptions &&
      typeof item.selectedOptions === 'object' &&
      Object.keys(item.selectedOptions).length > 0
        ? { selectedOptions: item.selectedOptions }
        : {}),
    };
  });

  const createdAt = order.createdAt;
  const updatedAt = order.updatedAt;

  return {
    _id: order._id != null ? leanIdToString(order._id) : undefined,
    orderNumber: order.orderNumber,
    customer: order.customer,
    vendor: vendorSummary,
    items,
    totalAmount: order.totalAmount,
    notes: order.notes ?? '',
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
    updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
  };
}
