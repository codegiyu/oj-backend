import { Product } from '../../models/product';
import { paginatedFind, findByIdLean } from './paginatedList.repository';

const adminProductPopulate = [
  { path: 'vendor', select: 'name slug storeName' },
  { path: 'category', select: 'name slug' },
  { path: 'subCategory', select: 'name slug' },
];

export async function listAdminProductRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return paginatedFind(Product, { ...options, populate: adminProductPopulate });
}

export async function findAdminProductById(id: string) {
  return findByIdLean(Product, id, adminProductPopulate);
}
