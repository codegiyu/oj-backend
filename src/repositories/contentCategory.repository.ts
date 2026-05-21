import { ContentCategory } from '../models/contentCategory';
import { clampPublicCatalogLimit } from '../constants/pagination';
import type { ContentCategoryScope } from '../lib/types/constants';
import type { IContentCategory } from '../lib/types/constants';

export type ListActiveContentCategoriesOptions = {
  scope?: ContentCategoryScope;
  limit?: number;
  skip?: number;
};

export async function listActiveContentCategories(
  options: ListActiveContentCategoriesOptions = {}
): Promise<IContentCategory[]> {
  const filter: Record<string, unknown> = { isActive: true };

  if (options.scope) {
    filter.scope = options.scope;
  }

  const limit = clampPublicCatalogLimit(options.limit);
  const skip = Math.max(0, options.skip ?? 0);

  return ContentCategory.find(filter)
    .sort({ displayOrder: 1, name: 1 })
    .skip(skip)
    .limit(limit)
    .lean<IContentCategory[]>();
}
