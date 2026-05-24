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
