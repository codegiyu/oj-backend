import { ContentCategory } from '../../models/contentCategory';
import { paginatedFind, findByIdLean } from './paginatedList.repository';

export async function listAdminContentCategoryRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return paginatedFind(ContentCategory, options);
}

export async function findAdminContentCategoryById(id: string) {
  return findByIdLean(ContentCategory, id);
}
