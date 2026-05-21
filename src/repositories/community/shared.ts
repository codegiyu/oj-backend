import mongoose, { type QueryFilter } from 'mongoose';

/** Resolve document by id (ObjectId) or slug. Returns null if not found. */
export async function findByIdOrSlug<T>(
  model: mongoose.Model<T>,
  idOrSlug: string,
  filter: QueryFilter<T> = {}
): Promise<Record<string, unknown> | null> {
  if (
    mongoose.Types.ObjectId.isValid(idOrSlug) &&
    String(new mongoose.Types.ObjectId(idOrSlug)) === idOrSlug
  ) {
    const byIdFilter: QueryFilter<T> = {
      ...filter,
      _id: new mongoose.Types.ObjectId(idOrSlug),
    };
    const byId = await model.findOne(byIdFilter).lean();

    if (byId) {
      return byId as unknown as Record<string, unknown>;
    }
  }

  const bySlugFilter: QueryFilter<T> = {
    ...filter,
    slug: idOrSlug,
  };
  const bySlug = await model.findOne(bySlugFilter).lean();

  return bySlug as unknown as Record<string, unknown> | null;
}
