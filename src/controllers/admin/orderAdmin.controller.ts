import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Order } from '../../models/order';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { parsePositiveInteger, parseSearch, parseString, normalizeSort } from '../../utils/helpers';
import { requireAdmin, parseObjectId } from './admin.helpers';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'orderNumber', 'status', 'totalAmount'];

function mapOrderToPopulated(order: Record<string, unknown>): Record<string, unknown> {
  const vendorDoc = order.vendor as Record<string, unknown> | undefined;
  const vendorSummary = {
    _id: (vendorDoc?._id ?? order.vendor) != null ? String(vendorDoc?._id ?? order.vendor) : undefined,
    name: vendorDoc?.name,
    slug: vendorDoc?.slug,
    storeName: vendorDoc?.storeName,
  };

  const items =
    (order.items as Array<Record<string, unknown>> | undefined)?.map((item: Record<string, unknown>) => {
      const productDoc = item.product as Record<string, unknown> | undefined;
      const product =
        productDoc && typeof productDoc === 'object' && productDoc._id != null
          ? {
              _id: String(productDoc._id),
              name: productDoc.name,
              slug: productDoc.slug,
              price: productDoc.price,
              images: Array.isArray(productDoc.images) ? productDoc.images : [],
              image: Array.isArray(productDoc.images) ? (productDoc.images as string[])[0] : productDoc.image,
            }
          : {
              _id: item.product != null ? String(item.product) : '',
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
        Object.keys(item.selectedOptions as object).length > 0
          ? { selectedOptions: item.selectedOptions }
          : {}),
      };
    }) ?? [];

  const createdAt = order.createdAt;
  const updatedAt = order.updatedAt;

  return {
    _id: order._id != null ? String(order._id) : undefined,
    orderNumber: order.orderNumber,
    customer: order.customer,
    vendor: vendorSummary,
    items,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
    updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
  };
}

export async function listAdminOrders(
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string; search?: string; status?: string; vendor?: string; sort?: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const limit = parsePositiveInteger(request.query.limit, 25, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  const search = parseSearch(request.query.search);
  const status = parseString(request.query.status);
  const vendorId = parseString(request.query.vendor);
  if (status) filter.status = status;
  if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
    filter.vendor = new mongoose.Types.ObjectId(vendorId);
  }
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'customer.name': { $regex: search, $options: 'i' } },
      { 'customer.email': { $regex: search, $options: 'i' } },
      { 'customer.phone': { $regex: search, $options: 'i' } },
    ];
  }

  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, '-createdAt');

  const [items, total] = await Promise.all([
    Order.find(filter).sort(sortStr).populate('vendor', 'name slug storeName').populate('items.product', 'name slug price images').skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  const orders = (items as Record<string, unknown>[]).map(mapOrderToPopulated);

  sendResponse(reply, 200, {
    orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  }, 'Orders list loaded.');
}

export async function getAdminOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const doc = await Order.findById(id).populate('vendor', 'name slug storeName whatsapp').populate('items.product', 'name slug price images').lean();
  if (!doc) throw new AppError('Order not found', 404);
  const order = mapOrderToPopulated(doc as unknown as Record<string, unknown>);
  sendResponse(reply, 200, { order }, 'Order loaded.');
}
