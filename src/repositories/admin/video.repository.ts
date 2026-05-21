import { Video } from '../../models/video';
import { paginatedFind, findByIdLean } from './paginatedList.repository';
import { adminArtistPopulate } from './populate';

export type ListAdminVideoOptions = {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
};

export async function listAdminVideoRows(
  options: ListAdminVideoOptions
): Promise<{ items: Record<string, unknown>[]; total: number }> {
  return paginatedFind(Video, {
    filter: options.filter,
    sort: options.sort,
    skip: options.skip,
    limit: options.limit,
    populate: adminArtistPopulate,
  });
}

export async function findAdminVideoById(id: string): Promise<Record<string, unknown> | null> {
  return findByIdLean(Video, id, adminArtistPopulate);
}
