import { Testimony } from '../../models/testimony';
import { findByIdOrSlug } from './shared';
import {
  mergePublicFilter,
  publishedTextContentCompletenessFilter,
} from '../../utils/contentCompleteness';

export async function countPublishedTestimonies(): Promise<number> {
  return Testimony.countDocuments(
    mergePublicFilter({ status: 'published' }, publishedTextContentCompletenessFilter())
  );
}

export async function findFeaturedTestimonies(limit: number): Promise<Record<string, unknown>[]> {
  const items = await Testimony.find(
    mergePublicFilter(
      { status: 'published', isFeatured: true },
      publishedTextContentCompletenessFilter()
    )
  )
    .sort({ displayOrder: 1, createdAt: -1 })
    .limit(limit)
    .lean();

  return items as unknown as Record<string, unknown>[];
}

export async function listPublishedTestimonies(options: {
  filter: Record<string, unknown>;
  sort: Record<string, 1 | -1>;
  skip: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const [items, total] = await Promise.all([
    Testimony.find(options.filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    Testimony.countDocuments(options.filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}

export async function findPublishedTestimonyByIdOrSlug(
  idOrSlug: string
): Promise<Record<string, unknown> | null> {
  return findByIdOrSlug(Testimony, idOrSlug, { status: 'published' });
}

export async function createTestimony(
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const doc = await Testimony.create(data);
  const raw = (doc.toObject ? doc.toObject() : doc) as unknown as Record<string, unknown>;

  return raw;
}
