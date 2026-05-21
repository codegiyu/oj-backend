import { Devotional } from '../../models/devotional';
import { paginatedFind, findByIdLean } from './paginatedList.repository';
import { adminArtistPopulate } from './populate';

export async function listAdminDevotionalRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return paginatedFind(Devotional, { ...options, populate: adminArtistPopulate });
}

export async function findAdminDevotionalById(id: string) {
  return findByIdLean(Devotional, id, adminArtistPopulate);
}
