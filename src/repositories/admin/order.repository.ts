import { Order } from '../../models/order';
import { paginatedFind, findByIdLean } from './paginatedList.repository';

const adminOrderPopulate = [
  { path: 'vendor', select: 'name slug storeName' },
  { path: 'items.product', select: 'name slug price images' },
];

export async function listAdminOrderRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return paginatedFind(Order, { ...options, populate: adminOrderPopulate });
}

export async function findAdminOrderById(id: string) {
  return findByIdLean(Order, id, [
    { path: 'vendor', select: 'name slug storeName whatsapp' },
    { path: 'items.product', select: 'name slug price images' },
  ]);
}
