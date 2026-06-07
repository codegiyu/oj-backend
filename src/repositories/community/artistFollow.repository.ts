import mongoose from 'mongoose';
import { ArtistFollow } from '../../models/artistFollow';

export async function createArtistFollow(data: {
  user: mongoose.Types.ObjectId;
  artist: mongoose.Types.ObjectId;
}): Promise<void> {
  await ArtistFollow.create(data);
}

export async function deleteArtistFollow(
  userId: mongoose.Types.ObjectId,
  artistId: mongoose.Types.ObjectId
): Promise<number> {
  const result = await ArtistFollow.deleteOne({ user: userId, artist: artistId });

  return result.deletedCount ?? 0;
}

export async function artistFollowExists(
  userId: mongoose.Types.ObjectId,
  artistId: mongoose.Types.ObjectId
): Promise<boolean> {
  const existing = await ArtistFollow.exists({ user: userId, artist: artistId });

  return existing != null;
}

export async function countFollowsByArtist(): Promise<
  Array<{ artistId: mongoose.Types.ObjectId; count: number }>
> {
  const rows = await ArtistFollow.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $group: { _id: '$artist', count: { $sum: 1 } } },
  ]);

  return rows.map(row => ({ artistId: row._id, count: row.count }));
}

export async function listFollowedArtistIdsForUser(
  userId: mongoose.Types.ObjectId,
  artistIds: mongoose.Types.ObjectId[]
): Promise<mongoose.Types.ObjectId[]> {
  if (artistIds.length === 0) return [];

  const follows = await ArtistFollow.find({
    user: userId,
    artist: { $in: artistIds },
  })
    .select('artist')
    .lean();

  return follows.map(follow => follow.artist);
}

export async function findArtistFollowPopulated(
  userId: mongoose.Types.ObjectId,
  artistId: mongoose.Types.ObjectId
): Promise<Record<string, unknown> | null> {
  const doc = await ArtistFollow.findOne({ user: userId, artist: artistId })
    .populate('artist', 'name slug image genre followerCount user')
    .lean();

  return doc as unknown as Record<string, unknown> | null;
}

export async function listArtistFollowsByUser(options: {
  userId: mongoose.Types.ObjectId;
  skip: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const filter = { user: options.userId };

  const [items, total] = await Promise.all([
    ArtistFollow.find(filter)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .populate('artist', 'name slug image genre followerCount user')
      .lean(),
    ArtistFollow.countDocuments(filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}
