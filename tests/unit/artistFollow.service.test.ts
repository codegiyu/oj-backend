import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/utils/AppError';

const {
  createArtistFollow,
  deleteArtistFollow,
  artistFollowExists,
  findArtistFollowPopulated,
  listArtistFollowsByUser,
  listFollowedArtistIdsForUser,
  artistFindOne,
  artistUpdateOne,
} = vi.hoisted(() => ({
  createArtistFollow: vi.fn(),
  deleteArtistFollow: vi.fn(),
  artistFollowExists: vi.fn(),
  findArtistFollowPopulated: vi.fn(),
  listArtistFollowsByUser: vi.fn(),
  listFollowedArtistIdsForUser: vi.fn(),
  artistFindOne: vi.fn(),
  artistUpdateOne: vi.fn(),
}));

vi.mock('../../src/repositories/community/artistFollow.repository', () => ({
  createArtistFollow,
  deleteArtistFollow,
  artistFollowExists,
  findArtistFollowPopulated,
  listArtistFollowsByUser,
  listFollowedArtistIdsForUser,
}));

vi.mock('../../src/models/artist', () => ({
  Artist: {
    findOne: artistFindOne,
    updateOne: artistUpdateOne,
  },
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  followArtist,
  unfollowArtist,
  listUserFollows,
  isUserFollowingArtist,
  listFollowedArtistIdSet,
} from '../../src/services/artistFollow.service';

const userId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439099');
const artistId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
const otherUserId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439022');

function mockActiveArtist(overrides: Record<string, unknown> = {}) {
  artistFindOne.mockReturnValue({
    lean: vi.fn().mockResolvedValue({
      _id: artistId,
      name: 'Test Artist',
      slug: 'test-artist',
      image: 'image.jpg',
      genre: 'Gospel',
      followerCount: 3,
      user: null,
      ...overrides,
    }),
  });
}

describe('artistFollow.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('followArtist creates follow and increments followerCount', async () => {
    mockActiveArtist();
    artistFollowExists.mockResolvedValue(false);
    findArtistFollowPopulated.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      artist: {
        _id: artistId,
        name: 'Test Artist',
        slug: 'test-artist',
        followerCount: 4,
      },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await followArtist({ userId, artistId: artistId.toHexString() });

    expect(createArtistFollow).toHaveBeenCalledWith({ user: userId, artist: artistId });
    expect(artistUpdateOne).toHaveBeenCalledWith({ _id: artistId }, { $inc: { followerCount: 1 } });
    expect(result.artistId).toBe(artistId.toHexString());
    expect(result.followers).toBe(4);
  });

  it('followArtist blocks following own artist profile', async () => {
    mockActiveArtist({ user: userId });

    await expect(followArtist({ userId, artistId: artistId.toHexString() })).rejects.toThrow(
      new AppError('You cannot follow your own artist profile', 400)
    );

    expect(createArtistFollow).not.toHaveBeenCalled();
  });

  it('followArtist returns 409 when already following', async () => {
    mockActiveArtist();
    artistFollowExists.mockResolvedValue(true);

    await expect(followArtist({ userId, artistId: artistId.toHexString() })).rejects.toThrow(
      new AppError('Already following this artist', 409)
    );
  });

  it('unfollowArtist deletes follow and decrements followerCount', async () => {
    deleteArtistFollow.mockResolvedValue(1);

    await unfollowArtist({ userId, artistId: artistId.toHexString() });

    expect(deleteArtistFollow).toHaveBeenCalledWith(userId, artistId);
    expect(artistUpdateOne).toHaveBeenCalledWith(
      { _id: artistId, followerCount: { $gt: 0 } },
      { $inc: { followerCount: -1 } }
    );
  });

  it('unfollowArtist returns 404 when follow is missing', async () => {
    deleteArtistFollow.mockResolvedValue(0);

    await expect(unfollowArtist({ userId, artistId: artistId.toHexString() })).rejects.toThrow(
      new AppError('Follow not found', 404)
    );
  });

  it('listUserFollows returns shaped items', async () => {
    listArtistFollowsByUser.mockResolvedValue({
      items: [
        {
          _id: new mongoose.Types.ObjectId(),
          artist: {
            _id: artistId,
            name: 'Test Artist',
            slug: 'test-artist',
            followerCount: 2,
          },
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      ],
      total: 1,
    });

    const result = await listUserFollows({ userId, page: 1, limit: 20 });

    expect(result.total).toBe(1);
    expect(result.items[0]?.name).toBe('Test Artist');
  });

  it('isUserFollowingArtist delegates to repository', async () => {
    artistFollowExists.mockResolvedValue(true);

    await expect(isUserFollowingArtist(userId, artistId)).resolves.toBe(true);
    expect(artistFollowExists).toHaveBeenCalledWith(userId, artistId);
  });

  it('listFollowedArtistIdSet returns a set of artist ids', async () => {
    listFollowedArtistIdsForUser.mockResolvedValue([artistId, otherUserId]);

    const result = await listFollowedArtistIdSet(userId, [artistId, otherUserId]);

    expect(result.has(artistId.toHexString())).toBe(true);
    expect(result.has(otherUserId.toHexString())).toBe(true);
  });
});
