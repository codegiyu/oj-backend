import mongoose from 'mongoose';
import { Artist } from '../models/artist';
import { AppError } from '../utils/AppError';
import { leanIdToString } from '../utils/leanId';
import { logger } from '../utils/logger';
import * as artistFollowRepo from '../repositories/community/artistFollow.repository';

const activeArtistFilter = {
  profileStatus: 'active',
  isActive: true,
} as const;

function favoriteCreatedAtIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;

  return '';
}

export interface ArtistFollowItemShape {
  _id: string;
  artistId: string;
  createdAt: string;
  name: string;
  slug: string;
  image?: string;
  genre?: string;
  followers: number;
}

async function findFollowableArtist(
  artistId: mongoose.Types.ObjectId
): Promise<Record<string, unknown>> {
  const artist = await Artist.findOne({ _id: artistId, ...activeArtistFilter }).lean();
  if (!artist) throw new AppError('Artist not found', 404);

  return artist as unknown as Record<string, unknown>;
}

function assertNotOwnArtistProfile(
  artist: Record<string, unknown>,
  userId: mongoose.Types.ObjectId
): void {
  const ownerId = artist.user;
  if (!ownerId) return;

  const ownerIdStr = leanIdToString(ownerId);
  if (ownerIdStr && ownerIdStr === userId.toHexString()) {
    throw new AppError('You cannot follow your own artist profile', 400);
  }
}

function shapeFollowItem(raw: Record<string, unknown>): ArtistFollowItemShape {
  const artist = raw.artist;
  const artistDoc =
    artist && typeof artist === 'object' ? (artist as Record<string, unknown>) : null;

  return {
    _id: leanIdToString(raw._id),
    artistId: leanIdToString(artistDoc?._id ?? raw.artist),
    createdAt: favoriteCreatedAtIso(raw.createdAt),
    name: typeof artistDoc?.name === 'string' ? artistDoc.name : '',
    slug: typeof artistDoc?.slug === 'string' ? artistDoc.slug : '',
    image: typeof artistDoc?.image === 'string' ? artistDoc.image : undefined,
    genre: typeof artistDoc?.genre === 'string' ? artistDoc.genre : undefined,
    followers: typeof artistDoc?.followerCount === 'number' ? artistDoc.followerCount : 0,
  };
}

export async function followArtist(params: {
  userId: mongoose.Types.ObjectId;
  artistId: string;
}): Promise<ArtistFollowItemShape> {
  if (!mongoose.Types.ObjectId.isValid(params.artistId)) {
    throw new AppError('Invalid artistId', 400);
  }

  const artistObjectId = new mongoose.Types.ObjectId(params.artistId);
  const artist = await findFollowableArtist(artistObjectId);
  assertNotOwnArtistProfile(artist, params.userId);

  const alreadyFollowing = await artistFollowRepo.artistFollowExists(params.userId, artistObjectId);
  if (alreadyFollowing) {
    throw new AppError('Already following this artist', 409);
  }

  await artistFollowRepo.createArtistFollow({ user: params.userId, artist: artistObjectId });
  await Artist.updateOne({ _id: artistObjectId }, { $inc: { followerCount: 1 } });

  logger.info('artist follow created', {
    userId: params.userId.toHexString(),
    artistId: artistObjectId.toHexString(),
  });

  const follow = await artistFollowRepo.findArtistFollowPopulated(params.userId, artistObjectId);
  if (!follow) {
    throw new AppError('Failed to follow artist', 500);
  }

  return shapeFollowItem(follow);
}

export async function unfollowArtist(params: {
  userId: mongoose.Types.ObjectId;
  artistId: string;
}): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(params.artistId)) {
    throw new AppError('Invalid artistId', 400);
  }

  const artistObjectId = new mongoose.Types.ObjectId(params.artistId);
  const deletedCount = await artistFollowRepo.deleteArtistFollow(params.userId, artistObjectId);

  if (deletedCount === 0) {
    throw new AppError('Follow not found', 404);
  }

  await Artist.updateOne(
    { _id: artistObjectId, followerCount: { $gt: 0 } },
    { $inc: { followerCount: -1 } }
  );

  logger.info('artist follow removed', {
    userId: params.userId.toHexString(),
    artistId: artistObjectId.toHexString(),
  });
}

export async function listUserFollows(params: {
  userId: mongoose.Types.ObjectId;
  page: number;
  limit: number;
}): Promise<{ items: ArtistFollowItemShape[]; total: number }> {
  const skip = (params.page - 1) * params.limit;
  const { items, total } = await artistFollowRepo.listArtistFollowsByUser({
    userId: params.userId,
    skip,
    limit: params.limit,
  });

  return {
    items: items.map(shapeFollowItem),
    total,
  };
}

export async function isUserFollowingArtist(
  userId: mongoose.Types.ObjectId,
  artistId: mongoose.Types.ObjectId
): Promise<boolean> {
  return artistFollowRepo.artistFollowExists(userId, artistId);
}

export async function listFollowedArtistIdSet(
  userId: mongoose.Types.ObjectId,
  artistIds: mongoose.Types.ObjectId[]
): Promise<Set<string>> {
  const followed = await artistFollowRepo.listFollowedArtistIdsForUser(userId, artistIds);

  return new Set(followed.map(id => leanIdToString(id)));
}
