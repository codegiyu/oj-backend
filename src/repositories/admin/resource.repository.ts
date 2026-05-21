import { Resource } from '../../models/resource';
import { paginatedFind, findByIdLean } from './paginatedList.repository';

export async function listAdminResourceRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return paginatedFind(Resource, options);
}

export async function findAdminResourceById(id: string) {
  return findByIdLean(Resource, id);
}
