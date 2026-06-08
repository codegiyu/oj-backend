import { Video } from '../../models/video';
import type { ModelVideo } from '../../lib/types/constants';
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
): Promise<{ items: ModelVideo[]; total: number }> {
  return paginatedFind<ModelVideo>(Video, {
    filter: options.filter,
    sort: options.sort,
    skip: options.skip,
    limit: options.limit,
    populate: adminArtistPopulate,
  });
}

export async function findAdminVideoById(id: string): Promise<ModelVideo | null> {
  return findByIdLean<ModelVideo>(Video, id, adminArtistPopulate);
}
