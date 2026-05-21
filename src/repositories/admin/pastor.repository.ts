import { Pastor } from '../../models/pastor';
import { paginatedFind, findByIdLean } from './paginatedList.repository';

export async function listAdminPastorRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return paginatedFind(Pastor, options);
}

export async function findAdminPastorById(id: string) {
  return findByIdLean(Pastor, id);
}
