import { Resource } from '../../models/resource';

export async function countPublishedResources(): Promise<number> {
  return Resource.countDocuments({ status: 'published' });
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
