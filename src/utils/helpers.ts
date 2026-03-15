import { customAlphabet } from 'nanoid';
import mongoose from 'mongoose';

/** Generate a numeric OTP string (e.g. 6 digits). */
export function generateRandomNumber(digits: number = 6): string {
  const nums = customAlphabet('0123456789', digits);
  return nums();
}

export function generateRandomString(length: number, prefix?: string): string {
  const nanoid = customAlphabet(
    '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ',
    length
  );
  return prefix ? `${prefix}-${nanoid()}` : nanoid();
}

/** Create a URL-safe slug from a string (e.g. "Store Name" -> "store-name"). */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

type WithSlug = { slug: string };

export async function generateUniqueSlug<T extends WithSlug>(
  model: mongoose.Model<T>,
  base: string,
  filter: Record<string, unknown> = {}
): Promise<string> {
  const baseSlug = slugify(base);
  let slug = baseSlug;
  let n = 0;

  // Ensure uniqueness with optional extra filter (e.g. vendor, category)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await model.findOne({ ...filter, slug }).select('_id').lean();
    if (!existing) break;
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  return slug;
}

export async function generateVendorProductSlug<T extends WithSlug>(
  model: mongoose.Model<T>,
  vendorId: mongoose.Types.ObjectId,
  name: string
): Promise<string> {
  return generateUniqueSlug(model, name, { vendor: vendorId });
}

export async function generateCategorySlug<T extends WithSlug>(
  model: mongoose.Model<T>,
  name: string
): Promise<string> {
  return generateUniqueSlug(model, name);
}

export async function generateSubCategorySlug<
  TCategory extends { slug: string },
  TSub extends WithSlug & { category: mongoose.Types.ObjectId }
>(
  categoryModel: mongoose.Model<TCategory>,
  subCategoryModel: mongoose.Model<TSub>,
  categoryId: mongoose.Types.ObjectId,
  name: string
): Promise<string> {
  const category = await categoryModel.findById(categoryId).select('slug').lean();
  const categorySlug = category?.slug ?? 'category';
  const nameSlug = slugify(name);
  const base = `${categorySlug}-${nameSlug}`;
  return generateUniqueSlug(subCategoryModel, base, { category: categoryId });
}

export function deleteFields<T extends Record<string, unknown>>(
  obj: T,
  fields: string[]
): T {
  const result = JSON.parse(JSON.stringify(obj)) as T;
  for (const field of fields) {
    const parts = field.replace('+', '').split('.');
    let target: Record<string, unknown> = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (key in target && typeof target[key] === 'object' && target[key] !== null) {
        target = target[key] as Record<string, unknown>;
      }
    }
    const lastKey = parts[parts.length - 1];
    if (lastKey && lastKey in target) {
      delete target[lastKey];
    }
  }
  return result;
}

/** Parse query param as positive integer; clamp to max; return fallback if invalid. */
export function parsePositiveInteger(
  value: unknown,
  fallback: number,
  maxValue: number
): number {
  if (typeof value !== 'string') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maxValue);
}

/** Parse query param as trimmed non-empty string. */
export function parseString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Search term: require at least 2 chars to avoid overly broad matches. */
export function parseSearch(value: unknown): string | undefined {
  const s = parseString(value);
  return s && s.length > 1 ? s : undefined;
}

/**
 * Normalize sort query (e.g. "name,-createdAt") to a MongoDB sort string.
 * Only allows fields in allowedFields; prefix with - for descending.
 */
export function normalizeSort(
  value: unknown,
  allowedFields: string[],
  defaultSort: string = '-createdAt'
): string {
  if (typeof value !== 'string' || value.trim().length === 0) return defaultSort;
  const normalized = value
    .split(',')
    .map(segment => segment.trim())
    .filter(segment => segment.length > 0)
    .map(segment => {
      const isDesc = segment.startsWith('-');
      const field = isDesc ? segment.slice(1) : segment;
      if (!allowedFields.includes(field)) return null;
      return `${isDesc ? '-' : ''}${field}`;
    })
    .filter((s): s is string => s !== null)
    .join(' ');
  return normalized.length > 0 ? normalized : defaultSort;
}
