import { AskPastorQuestion } from '../../models/askPastorQuestion';
import { paginatedFind, findByIdLean } from './paginatedList.repository';

export async function listAdminAskPastorRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return paginatedFind(AskPastorQuestion, {
    ...options,
    populate: { path: 'pastor', select: 'name slug image' },
  });
}

export async function findAdminAskPastorById(id: string) {
  return findByIdLean(AskPastorQuestion, id, { path: 'pastor', select: 'name slug image' });
}
