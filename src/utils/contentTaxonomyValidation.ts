import type { ContentCategoryScope } from '../lib/types/constants';
import { ContentCategory } from '../models/contentCategory';
import { AppError } from './AppError';

const MAX_TAGS = 32;
const MAX_TAG_LENGTH = 64;
const MAX_METADATA_STRING_LENGTH = 200;
const MEDIA_METADATA_STRING_FIELDS = new Set([
  'mimeType',
  'codec',
  'container',
  'provider',
  'probedAt',
]);
const MEDIA_METADATA_NUMBER_FIELDS = new Set([
  'durationSeconds',
  'fileSizeBytes',
  'width',
  'height',
  'bitrate',
  'sampleRate',
]);

export type PublishableContentTaxonomyInput = {
  scope: ContentCategoryScope;
  category?: string;
  tags?: string[];
  status?: string;
};

/** News editorial priority (1 = lowest, 5 = highest). Defaults to 1 when unset. */
export function assertNewsPriority(priority: unknown): number {
  if (priority === undefined || priority === null || priority === '') return 1;

  const numeric = typeof priority === 'number' ? priority : Number(priority);

  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 5) {
    throw new AppError('Priority must be an integer between 1 and 5', 400);
  }

  return numeric;
}

/** Validates and normalizes tag arrays from admin payloads. */
export function normalizeTags(tags: unknown): string[] | undefined {
  if (tags === undefined) return undefined;

  if (tags === null) return [];

  if (!Array.isArray(tags)) {
    throw new AppError('Tags must be an array of strings', 400);
  }

  const normalized: string[] = [];

  for (const tag of tags) {
    if (typeof tag !== 'string') {
      throw new AppError('Each tag must be a string', 400);
    }

    const trimmed = tag.trim();

    if (!trimmed) continue;

    if (trimmed.length > MAX_TAG_LENGTH) {
      throw new AppError(`Each tag must be at most ${MAX_TAG_LENGTH} characters`, 400);
    }

    if (!normalized.includes(trimmed)) normalized.push(trimmed);
  }

  if (normalized.length > MAX_TAGS) {
    throw new AppError(`At most ${MAX_TAGS} tags are allowed`, 400);
  }

  return normalized;
}

function assertNonNegativeFiniteNumber(value: unknown, field: string): number {
  const numeric = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new AppError(`Metadata ${field} must be a non-negative number`, 400);
  }

  return numeric;
}

function assertPositiveInteger(value: unknown, field: string): number {
  const numeric = assertNonNegativeFiniteNumber(value, field);

  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new AppError(`Metadata ${field} must be a positive integer`, 400);
  }

  return numeric;
}

function assertMetadataString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new AppError(`Metadata ${field} must be a string`, 400);
  }

  const trimmed = value.trim();
  if (trimmed.length > MAX_METADATA_STRING_LENGTH) {
    throw new AppError(
      `Metadata ${field} must be at most ${MAX_METADATA_STRING_LENGTH} characters`,
      400
    );
  }

  return trimmed;
}

export function assertMediaMetadata(metadata: unknown): Record<string, unknown> {
  if (metadata === undefined || metadata === null) return {};

  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new AppError('Metadata must be an object', 400);
  }

  const raw = metadata as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null || value === '') continue;

    if (MEDIA_METADATA_NUMBER_FIELDS.has(key)) {
      if (key === 'durationSeconds' || key === 'width' || key === 'height') {
        normalized[key] = assertPositiveInteger(value, key);
      } else {
        normalized[key] = assertNonNegativeFiniteNumber(value, key);
      }
      continue;
    }

    if (MEDIA_METADATA_STRING_FIELDS.has(key)) {
      normalized[key] = assertMetadataString(value, key);
      continue;
    }

    throw new AppError(`Unsupported metadata field: ${key}`, 400);
  }

  return normalized;
}

export async function assertPublishableContentTaxonomy(
  input: PublishableContentTaxonomyInput
): Promise<void> {
  if (input.status !== 'published') return;

  const category = typeof input.category === 'string' ? input.category.trim() : '';

  if (!category) {
    throw new AppError('Category is required when publishing content', 400);
  }

  const active = await ContentCategory.findOne({
    scope: input.scope,
    slug: category,
    isActive: true,
  })
    .select('_id')
    .lean();

  if (!active) {
    throw new AppError('Category must match an active content category for this scope', 400);
  }
}
