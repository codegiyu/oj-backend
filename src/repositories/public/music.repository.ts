import mongoose from 'mongoose';
import { Music } from '../../models/music';
import { ARTIST_POPULATE_SELECT } from '../../controllers/artist/artist.helpers';
import { findByIdOrSlug } from '../community/shared';

const PUBLISHED_ALBUM_POPULATE = {
  path: 'album' as const,
  select: '_id title slug status',
  match: { status: 'published' },
};

export async function listPublishedMusic(options: {
  filter: Record<string, unknown>;
  sort: Record<string, 1 | -1>;
  skip: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const [items, total] = await Promise.all([
    Music.find(options.filter)
      .sort(options.sort)
      .populate('artist', ARTIST_POPULATE_SELECT)
      .populate(PUBLISHED_ALBUM_POPULATE)
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    Music.countDocuments(options.filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}

export async function findPublishedMusicByIdOrSlug(
  idOrSlug: string
): Promise<Record<string, unknown> | null> {
  return findByIdOrSlug(Music, idOrSlug, { status: 'published' });
}

export async function findPublishedMusicByIdPopulated(
  id: unknown
): Promise<Record<string, unknown> | null> {
  const doc = await Music.findById(id)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .populate(PUBLISHED_ALBUM_POPULATE)
    .lean();

  return doc as unknown as Record<string, unknown> | null;
}

export async function incrementMusicDownloads(id: mongoose.Types.ObjectId): Promise<void> {
  await Music.updateOne({ _id: id }, { $inc: { downloads: 1 } });
}
