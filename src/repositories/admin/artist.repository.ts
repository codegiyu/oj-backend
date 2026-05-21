import { Artist } from '../../models/artist';
import { paginatedFind, findByIdLean } from './paginatedList.repository';

export async function listAdminArtistRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return paginatedFind(Artist, options);
}

export async function findAdminArtistById(id: string) {
  return findByIdLean(Artist, id);
}
