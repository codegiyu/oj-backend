import type { Model, PopulateOptions } from 'mongoose';

export type PaginatedListOptions = {
  filter: Record<string, unknown>;
  sort: string | Record<string, 1 | -1>;
  skip: number;
  limit: number;
  populate?: PopulateOptions | PopulateOptions[];
};

export async function paginatedFind<T>(
  model: Model<T>,
  options: PaginatedListOptions
): Promise<{ items: Record<string, unknown>[]; total: number }> {
  let query = model.find(options.filter).sort(options.sort).skip(options.skip).limit(options.limit);

  if (options.populate) {
    const populations = Array.isArray(options.populate) ? options.populate : [options.populate];

    for (const population of populations) {
      query = query.populate(population);
    }
  }

  const [items, total] = await Promise.all([query.lean(), model.countDocuments(options.filter)]);

  return {
    items: items as unknown as Record<string, unknown>[],
    total,
  };
}

export async function findByIdLean<T>(
  model: Model<T>,
  id: string,
  populate?: PopulateOptions | PopulateOptions[]
): Promise<Record<string, unknown> | null> {
  let query = model.findById(id);

  if (populate) {
    const populations = Array.isArray(populate) ? populate : [populate];

    for (const population of populations) {
      query = query.populate(population);
    }
  }

  const doc = await query.lean();

  return doc as unknown as Record<string, unknown> | null;
}
