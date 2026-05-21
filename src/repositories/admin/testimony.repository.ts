import { Testimony } from '../../models/testimony';
import { paginatedFind, findByIdLean } from './paginatedList.repository';

export async function listAdminTestimonyRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return paginatedFind(Testimony, options);
}

export async function findAdminTestimonyById(id: string) {
  return findByIdLean(Testimony, id);
}
