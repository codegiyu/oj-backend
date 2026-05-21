import { Music } from '../../models/music';

export const adminMusicArtistPopulate = {
  path: 'artist' as const,
  select: '_id name slug image user',
  populate: { path: 'user', select: '_id' },
};

export type ListAdminMusicOptions = {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
};

export async function listAdminMusicRows(
  options: ListAdminMusicOptions
): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const [items, total] = await Promise.all([
    Music.find(options.filter)
      .sort(options.sort)
      .populate(adminMusicArtistPopulate)
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    Music.countDocuments(options.filter),
  ]);

  return {
    items: items as unknown as Record<string, unknown>[],
    total,
  };
}

export async function findAdminMusicById(id: string): Promise<Record<string, unknown> | null> {
  const doc = await Music.findById(id).populate(adminMusicArtistPopulate).lean();

  return doc as unknown as Record<string, unknown> | null;
}
