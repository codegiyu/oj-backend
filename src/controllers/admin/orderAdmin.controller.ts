import { FastifyRequest, FastifyReply } from 'fastify';
import { sendResponse } from '../../utils/response';
import { mapPopulatedOrderToApi } from '../../utils/mapPopulatedOrder';
import type { PopulatedOrder } from '../../lib/types/constants';
import { runAdminList, runAdminGet } from '../../services/admin/runAdminListGet';
import { listAdminOrderRows, findAdminOrderById } from '../../repositories/admin/order.repository';
import { applyDateRangeFilter, applyVendorFilter } from '../../services/admin/adminListFilters';
import { AppError } from '../../utils/AppError';
import { parseObjectId } from './admin.helpers';
import { Order } from '../../models/order';
import {
  ORDER_STATUSES,
  ORDER_PAYMENT_STATUSES,
  type OrderStatus,
  type OrderPaymentStatus,
} from '../../utils/marketplaceProduct';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'orderNumber', 'status', 'totalAmount'];

function shapeOrderItem(raw: Record<string, unknown>): Record<string, unknown> {
  return mapPopulatedOrderToApi(raw as unknown as PopulatedOrder);
}

export async function listAdminOrders(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
      vendor?: string;
      startDate?: string;
      endDate?: string;
      sort?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: SORT_FIELDS,
    searchFields: ['orderNumber', 'customer.name', 'customer.email', 'customer.phone'],
    extendFilter: (filter, query) => {
      applyVendorFilter(filter, query.vendor);
      applyDateRangeFilter(filter, query.startDate, query.endDate);
    },
    listRows: listAdminOrderRows,
    shapeItem: shapeOrderItem,
    collectionKey: 'orders',
    message: 'Orders list loaded.',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminGet(request, {
    findById: findAdminOrderById,
    shapeItem: shapeOrderItem,
    itemKey: 'order',
    message: 'Order loaded.',
    notFoundMessage: 'Order not found',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function updateAdminOrder(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { status?: OrderStatus; paymentStatus?: OrderPaymentStatus };
  }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const body = request.body ?? {};

  if (body.status === undefined && body.paymentStatus === undefined) {
    throw new AppError('At least one of status or paymentStatus is required', 400);
  }

  if (body.status !== undefined && !ORDER_STATUSES.includes(body.status)) {
    throw new AppError('Invalid order status', 400);
  }

  if (body.paymentStatus !== undefined && !ORDER_PAYMENT_STATUSES.includes(body.paymentStatus)) {
    throw new AppError('Invalid payment status', 400);
  }

  const update: Record<string, string> = {};
  if (body.status !== undefined) update.status = body.status;
  if (body.paymentStatus !== undefined) update.paymentStatus = body.paymentStatus;

  const order = await Order.findByIdAndUpdate(id, { $set: update }, { new: true })
    .populate('vendor', 'name slug storeName')
    .populate('items.product', 'name slug price images')
    .lean<PopulatedOrder | null>();

  if (!order) throw new AppError('Order not found', 404);

  sendResponse(reply, 200, { order: mapPopulatedOrderToApi(order) }, 'Order updated.');
}
