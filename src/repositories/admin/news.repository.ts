import { NewsArticle } from '../../models/newsArticle';
import { paginatedFind, findByIdLean } from './paginatedList.repository';

export type ListAdminNewsOptions = {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
};

export async function listAdminNewsRows(
  options: ListAdminNewsOptions
): Promise<{ items: Record<string, unknown>[]; total: number }> {
  return paginatedFind(NewsArticle, {
    filter: options.filter,
    sort: options.sort,
    skip: options.skip,
    limit: options.limit,
  });
}

export async function findAdminNewsById(id: string): Promise<Record<string, unknown> | null> {
  return findByIdLean(NewsArticle, id);
}
