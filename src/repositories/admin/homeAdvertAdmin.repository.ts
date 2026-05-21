import { HomeAdvert } from '../../models/homeAdvert';
import { paginatedFind } from './paginatedList.repository';

export async function listAdminHomeAdvertRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return paginatedFind(HomeAdvert, options);
}
