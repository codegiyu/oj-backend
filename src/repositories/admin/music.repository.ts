import { Music } from '../../models/music';
import { paginatedFind, findByIdLean } from './paginatedList.repository';
import { adminMusicPopulate } from './populate';

export { adminMusicPopulate as adminMusicArtistPopulate };

export type ListAdminMusicOptions = {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
};

export async function listAdminMusicRows(
  options: ListAdminMusicOptions
): Promise<{ items: Record<string, unknown>[]; total: number }> {
  return paginatedFind(Music, {
    filter: options.filter,
    sort: options.sort,
    skip: options.skip,
    limit: options.limit,
    populate: adminMusicPopulate,
  });
}

export async function findAdminMusicById(id: string): Promise<Record<string, unknown> | null> {
  return findByIdLean(Music, id, adminMusicPopulate);
}
