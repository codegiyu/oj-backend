import { CONTENT_CATEGORY_SCOPES, type ContentCategoryScope } from '../lib/types/constants';
import { listActiveContentCategories } from '../repositories/contentCategory.repository';
import { listActiveHomeAdverts } from '../repositories/homeAdvert.repository';
import { parsePositiveInteger, parseString } from '../utils/helpers';
import { PUBLIC_CATALOG_MAX_ITEMS } from '../constants/pagination';

export type PublicContentCategoryDto = {
  _id: string;
  name: string;
  slug: string;
  scope: ContentCategoryScope;
};

export async function listPublicContentCategoriesForApi(query: {
  scope?: string;
  page?: string;
  limit?: string;
}): Promise<{ categories: PublicContentCategoryDto[] }> {
  const scopeRaw = parseString(query.scope);
  const scope =
    scopeRaw && CONTENT_CATEGORY_SCOPES.includes(scopeRaw as ContentCategoryScope)
      ? (scopeRaw as ContentCategoryScope)
      : undefined;

  const limit = parsePositiveInteger(
    query.limit,
    PUBLIC_CATALOG_MAX_ITEMS,
    PUBLIC_CATALOG_MAX_ITEMS
  );
  const page = parsePositiveInteger(query.page, 1, 1000);
  const skip = (page - 1) * limit;

  const items = await listActiveContentCategories({ scope, limit, skip });

  const categories = items.map(c => ({
    _id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    scope: c.scope,
  }));

  return { categories };
}

export async function listPublicHomeAdvertsForApi(query: { limit?: string }): Promise<{
  adverts: Array<{
    _id: string;
    slot: string;
    imageUrl: string;
    linkUrl?: string;
    displayOrder: number;
  }>;
}> {
  const limit = parsePositiveInteger(
    query.limit,
    PUBLIC_CATALOG_MAX_ITEMS,
    PUBLIC_CATALOG_MAX_ITEMS
  );

  const items = await listActiveHomeAdverts(limit);

  const adverts = items.map(a => ({
    _id: a._id.toString(),
    slot: a.slot,
    imageUrl: a.imageUrl,
    linkUrl: a.linkUrl,
    displayOrder: a.displayOrder,
  }));

  return { adverts };
}
