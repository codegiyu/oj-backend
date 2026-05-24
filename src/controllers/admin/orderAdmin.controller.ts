import { FastifyRequest, FastifyReply } from 'fastify';
import { sendResponse } from '../../utils/response';
import { mapPopulatedOrderToApi } from '../../utils/mapPopulatedOrder';
import type { PopulatedOrder } from '../../lib/types/constants';
import { runAdminList, runAdminGet } from '../../services/admin/runAdminListGet';
import { listAdminOrderRows, findAdminOrderById } from '../../repositories/admin/order.repository';
import { applyDateRangeFilter, applyVendorFilter } from '../../services/admin/adminListFilters';

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
