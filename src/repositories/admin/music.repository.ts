import { Music } from '../../models/music';
import type { ModelMusic } from '../../lib/types/constants';
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
): Promise<{ items: ModelMusic[]; total: number }> {
  return paginatedFind<ModelMusic>(Music, {
    filter: options.filter,
    sort: options.sort,
    skip: options.skip,
    limit: options.limit,
    populate: adminMusicPopulate,
  });
}

export async function findAdminMusicById(id: string): Promise<ModelMusic | null> {
  return findByIdLean<ModelMusic>(Music, id, adminMusicPopulate);
}
