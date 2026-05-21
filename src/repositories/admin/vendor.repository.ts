import { Vendor } from '../../models/vendor';
import { paginatedFind, findByIdLean } from './paginatedList.repository';

export async function listAdminVendorRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return paginatedFind(Vendor, options);
}

export async function findAdminVendorById(id: string) {
  return findByIdLean(Vendor, id);
}
