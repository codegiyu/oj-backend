import { Devotional } from '../../models/devotional';
import { ARTIST_POPULATE_SELECT } from '../../controllers/artist/artist.helpers';
import { findByIdOrSlug } from './shared';

export async function countPublishedDevotionals(): Promise<number> {
  return Devotional.countDocuments({ status: 'published' });
}

export async function findTrendingDevotionals(limit: number): Promise<Record<string, unknown>[]> {
  const items = await Devotional.find({ status: 'published' })
    .sort({ views: -1, createdAt: -1 })
    .limit(limit)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean();

  return items as unknown as Record<string, unknown>[];
}

export async function listPublishedDevotionals(options: {
  filter: Record<string, unknown>;
  sort: Record<string, 1 | -1>;
  skip: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const [items, total] = await Promise.all([
    Devotional.find(options.filter)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .populate('artist', ARTIST_POPULATE_SELECT)
      .lean(),
    Devotional.countDocuments(options.filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}

export async function findPublishedDevotionalByIdOrSlug(
  idOrSlug: string
): Promise<Record<string, unknown> | null> {
  return findByIdOrSlug(Devotional, idOrSlug, { status: 'published' });
}

export async function findDevotionalByIdPopulated(
  id: string
): Promise<Record<string, unknown> | null> {
  const doc = await Devotional.findById(id).populate('artist', ARTIST_POPULATE_SELECT).lean();

  return doc as unknown as Record<string, unknown> | null;
}

export async function findRelatedDevotionals(
  category: string,
  excludeId: string,
  limit: number
): Promise<Record<string, unknown>[]> {
  const items = await Devotional.find({
    status: 'published',
    category,
    _id: { $ne: excludeId },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean();

  return items as unknown as Record<string, unknown>[];
}
