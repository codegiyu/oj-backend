import { Pastor } from '../../models/pastor';

const activePastorFilter = {
  profileStatus: 'active',
  isActive: true,
} as const;

export async function listActivePastors(options: {
  skip: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const filter = activePastorFilter;
  const [items, total] = await Promise.all([
    Pastor.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    Pastor.countDocuments(filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}
