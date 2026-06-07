import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { countFollowsByArtist, artistBulkWrite, artistUpdateMany } = vi.hoisted(() => ({
  countFollowsByArtist: vi.fn(),
  artistBulkWrite: vi.fn(),
  artistUpdateMany: vi.fn(),
}));

vi.mock('../../src/repositories/community/artistFollow.repository', () => ({
  countFollowsByArtist,
}));

vi.mock('../../src/models/artist', () => ({
  Artist: {
    bulkWrite: artistBulkWrite,
    updateMany: artistUpdateMany,
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

import { reconcileArtistFollowerCounts } from '../../src/queues/handlers/reconcileArtistFollowerCounts';

describe('reconcileArtistFollowerCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates follower counts from aggregation and resets stale artists', async () => {
    const artistId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    countFollowsByArtist.mockResolvedValue([{ artistId, count: 12 }]);
    artistUpdateMany.mockResolvedValue({ modifiedCount: 2 });

    await reconcileArtistFollowerCounts({ id: 'job-1' } as never);

    expect(artistBulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { _id: artistId },
          update: { $set: { followerCount: 12 } },
        },
      },
    ]);
    expect(artistUpdateMany).toHaveBeenCalledWith(
      { followerCount: { $gt: 0 }, _id: { $nin: [artistId] } },
      { $set: { followerCount: 0 } }
    );
  });

  it('resets all positive counts when no follows exist', async () => {
    countFollowsByArtist.mockResolvedValue([]);
    artistUpdateMany.mockResolvedValue({ modifiedCount: 5 });

    await reconcileArtistFollowerCounts({ id: 'job-2' } as never);

    expect(artistBulkWrite).not.toHaveBeenCalled();
    expect(artistUpdateMany).toHaveBeenCalledWith(
      { followerCount: { $gt: 0 } },
      { $set: { followerCount: 0 } }
    );
  });
});
