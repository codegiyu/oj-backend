import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Order } from '../../models/order';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { parsePositiveInteger, parseSearch, parseString, normalizeSort } from '../../utils/helpers';
import { mapPopulatedOrderToApi } from '../../utils/mapPopulatedOrder';
import type { PopulatedOrder } from '../../lib/types/constants';
import { parseObjectId } from './admin.helpers';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'orderNumber', 'status', 'totalAmount'];

export async function listAdminOrders(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
      vendor?: string;
      sort?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
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
    Order.find(filter)
      .sort(sortStr)
      .populate('vendor', 'name slug storeName')
      .populate('items.product', 'name slug price images')
      .skip(skip)
      .limit(limit)
      .lean<PopulatedOrder[]>(),
    Order.countDocuments(filter),
  ]);

  const orders = items.map(mapPopulatedOrderToApi);

  sendResponse(
    reply,
    200,
    {
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    },
    'Orders list loaded.'
  );
}

export async function getAdminOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const doc = await Order.findById(id)
    .populate('vendor', 'name slug storeName whatsapp')
    .populate('items.product', 'name slug price images')
    .lean<PopulatedOrder | null>();
  if (!doc) throw new AppError('Order not found', 404);
  const order = mapPopulatedOrderToApi(doc);
  sendResponse(reply, 200, { order }, 'Order loaded.');
}
