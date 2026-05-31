import { Resource } from '../../models/resource';
import { RESOURCE_TYPES } from '../../lib/types/constants';
import {
  mergePublicFilter,
  publishedResourceCompletenessFilter,
} from '../../utils/contentCompleteness';

function publishedResourceFilter(): Record<string, unknown> {
  return mergePublicFilter({ status: 'published' }, publishedResourceCompletenessFilter());
}

export async function countPublishedResources(): Promise<number> {
  return Resource.countDocuments(publishedResourceFilter());
}

/** Counts per resource type plus total (published + completeness). */
export async function countPublishedResourcesByType(): Promise<{
  all: number;
  byType: Record<(typeof RESOURCE_TYPES)[number], number>;
}> {
  const base = publishedResourceFilter();
  const all = await Resource.countDocuments(base);

  const entries = await Promise.all(
    RESOURCE_TYPES.map(async type => {
      const count = await Resource.countDocuments({ ...base, type });

      return [type, count] as const;
    })
  );

  const byType = Object.fromEntries(entries) as Record<(typeof RESOURCE_TYPES)[number], number>;

  return { all, byType };
}

export async function listPublishedResources(options: {
  filter: Record<string, unknown>;
  skip: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const [items, total] = await Promise.all([
    Resource.find(options.filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    Resource.countDocuments(options.filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}
