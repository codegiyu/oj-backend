import mongoose from 'mongoose';
import { Video } from '../../models/video';
import { ARTIST_POPULATE_SELECT } from '../../controllers/artist/artist.helpers';
import { findByIdOrSlug } from '../community/shared';

export async function listPublishedVideos(options: {
  filter: Record<string, unknown>;
  sort: Record<string, 1 | -1>;
  skip: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const [items, total] = await Promise.all([
    Video.find(options.filter)
      .sort(options.sort)
      .populate('artist', ARTIST_POPULATE_SELECT)
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    Video.countDocuments(options.filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}

export async function findPublishedVideoByIdOrSlug(
  idOrSlug: string
): Promise<Record<string, unknown> | null> {
  return findByIdOrSlug(Video, idOrSlug, { status: 'published' });
}

export async function findPublishedVideoByIdPopulated(
  id: unknown
): Promise<Record<string, unknown> | null> {
  const doc = await Video.findById(id).populate('artist', ARTIST_POPULATE_SELECT).lean();

  return doc as unknown as Record<string, unknown> | null;
}

export async function incrementVideoDownloads(id: mongoose.Types.ObjectId): Promise<void> {
  await Video.updateOne({ _id: id }, { $inc: { downloads: 1 } });
}
