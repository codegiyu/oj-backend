import { NewsArticle } from '../../models/newsArticle';
import type { ModelNewsArticle } from '../../lib/types/constants';
import { paginatedFind, findByIdLean } from './paginatedList.repository';

export type ListAdminNewsOptions = {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
};

export async function listAdminNewsRows(
  options: ListAdminNewsOptions
): Promise<{ items: ModelNewsArticle[]; total: number }> {
  return paginatedFind<ModelNewsArticle>(NewsArticle, {
    filter: options.filter,
    sort: options.sort,
    skip: options.skip,
    limit: options.limit,
  });
}

export async function findAdminNewsById(id: string): Promise<ModelNewsArticle | null> {
  return findByIdLean<ModelNewsArticle>(NewsArticle, id);
}
