import mongoose from 'mongoose';

const FILTER_ALL = 'all';

function isValidObjectId(value: string): boolean {
  return mongoose.Types.ObjectId.isValid(value);
}

function parseFilterDate(value: string | undefined): Date | undefined {
  if (!value?.trim()) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Apply content-category filter (music/video/news store category as slug string).
 * Empty string matches uncategorized content when explicitly selected.
 */
export function applyCategoryFilter(
  filter: Record<string, unknown>,
  category: string | undefined
): void {
  const slug = category?.trim();
  if (!slug || slug === FILTER_ALL) return;
  filter.category = slug;
}

/** Apply artist filter when value is a valid ObjectId. */
export function applyArtistFilter(
  filter: Record<string, unknown>,
  artist: string | undefined
): void {
  const id = artist?.trim();
  if (!id || id === FILTER_ALL || !isValidObjectId(id)) return;
  filter.artist = new mongoose.Types.ObjectId(id);
}

/** Apply marketplace vendor filter when value is a valid ObjectId. */
export function applyVendorFilter(
  filter: Record<string, unknown>,
  vendor: string | undefined
): void {
  const id = vendor?.trim();
  if (!id || id === FILTER_ALL || !isValidObjectId(id)) return;
  filter.vendor = new mongoose.Types.ObjectId(id);
}

/** Standard admin list query params plus optional content filters. */
export type AdminListQuerystring = {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  sort?: string;
};

export type ContentListQuery = AdminListQuerystring & {
  category?: string;
  artist?: string;
  type?: string;
};

/** Category slug + optional artist ObjectId (music, video, devotional). */
export function applyContentListExtendFilters(
  filter: Record<string, unknown>,
  query: ContentListQuery
): void {
  applyCategoryFilter(filter, query.category);
  applyArtistFilter(filter, query.artist);
}

/** Category slug only (polls, resources, testimonies, etc.). */
export function applyCategoryOnlyExtendFilters(
  filter: Record<string, unknown>,
  query: ContentListQuery
): void {
  applyCategoryFilter(filter, query.category);
}

/** Marketplace product category (ObjectId on Product.category). */
export function applyMarketplaceCategoryFilter(
  filter: Record<string, unknown>,
  category: string | undefined
): void {
  const id = category?.trim();
  if (!id || id === FILTER_ALL || !isValidObjectId(id)) return;
  filter.category = new mongoose.Types.ObjectId(id);
}

/** Content category admin list: isActive query (active | inactive). */
export function applyIsActiveQueryFilter(
  filter: Record<string, unknown>,
  isActive: string | undefined
): void {
  const value = isActive?.trim();
  if (value === 'active') filter.isActive = true;
  else if (value === 'inactive') filter.isActive = false;
}

/** Apply createdAt range for list endpoints that support startDate/endDate query params. */
export function applyDateRangeFilter(
  filter: Record<string, unknown>,
  startDate: string | undefined,
  endDate: string | undefined
): void {
  const start = parseFilterDate(startDate);
  const end = parseFilterDate(endDate);
  if (!start && !end) return;

  const createdAt: Record<string, Date> = {};
  if (start) createdAt.$gte = start;
  if (end) createdAt.$lte = end;
  filter.createdAt = createdAt;
}
