import { Poll } from '../../models/poll';
import { paginatedFind, findByIdLean } from './paginatedList.repository';

export async function listAdminPollRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return paginatedFind(Poll, options);
}

export async function findAdminPollById(id: string) {
  return findByIdLean(Poll, id);
}
