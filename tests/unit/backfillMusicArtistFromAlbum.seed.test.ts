import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import {
  MOCK_ALBUM_IDS,
  MOCK_ARTIST_IDS,
  MOCK_TRACK_IDS,
  toObjectId,
} from '../helpers/albumMusicFixtures';

const { musicFindMock, musicUpdateOneMock, albumFindByIdMock } = vi.hoisted(() => ({
  musicFindMock: vi.fn(),
  musicUpdateOneMock: vi.fn(),
  albumFindByIdMock: vi.fn(),
}));

vi.mock('../../src/models/music', () => ({
  Music: {
    find: musicFindMock,
    updateOne: musicUpdateOneMock,
  },
}));

vi.mock('../../src/models/album', () => ({
  Album: {
    findById: albumFindByIdMock,
  },
}));

import { backfillMusicArtistFromAlbum } from '../../src/seed/backfillMusicArtistFromAlbum';

function mockMusicCursor(
  items: Array<{ _id: mongoose.Types.ObjectId; album: mongoose.Types.ObjectId }>
) {
  return {
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockReturnValue({
        cursor: vi.fn().mockReturnValue({
          [Symbol.asyncIterator]() {
            let index = 0;

            return {
              next() {
                if (index >= items.length) {
                  return Promise.resolve({ done: true as const, value: undefined });
                }

                const value = items[index];
                index += 1;

                return Promise.resolve({ done: false as const, value });
              },
            };
          },
        }),
      }),
    }),
  };
}

describe('backfillMusicArtistFromAlbum', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    musicUpdateOneMock.mockResolvedValue({ modifiedCount: 1 });
    albumFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ artist: toObjectId(MOCK_ARTIST_IDS.primary) }),
      }),
    });
  });

  it('sets artist from album when track artist is null', async () => {
    const trackId = toObjectId(MOCK_TRACK_IDS.primary);
    const albumId = toObjectId(MOCK_ALBUM_IDS.primary);
    musicFindMock.mockReturnValue(mockMusicCursor([{ _id: trackId, album: albumId }]));

    const stats = await backfillMusicArtistFromAlbum();

    expect(stats).toEqual({
      candidates: 1,
      updated: 1,
      skippedNoAlbumArtist: 0,
      skippedAlreadySet: 0,
    });
    expect(musicUpdateOneMock).toHaveBeenCalledWith(
      { _id: trackId, artist: null },
      { $set: { artist: toObjectId(MOCK_ARTIST_IDS.primary) } }
    );
  });

  it('skips albums without an artist owner', async () => {
    const trackId = toObjectId(MOCK_TRACK_IDS.primary);
    const albumId = toObjectId(MOCK_ALBUM_IDS.primary);
    musicFindMock.mockReturnValue(mockMusicCursor([{ _id: trackId, album: albumId }]));
    albumFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ artist: null }),
      }),
    });

    const stats = await backfillMusicArtistFromAlbum();

    expect(stats.updated).toBe(0);
    expect(stats.skippedNoAlbumArtist).toBe(1);
    expect(musicUpdateOneMock).not.toHaveBeenCalled();
  });

  it('is idempotent when artist was set between read and update', async () => {
    const trackId = toObjectId(MOCK_TRACK_IDS.primary);
    const albumId = toObjectId(MOCK_ALBUM_IDS.primary);
    musicFindMock.mockReturnValue(mockMusicCursor([{ _id: trackId, album: albumId }]));
    musicUpdateOneMock.mockResolvedValue({ modifiedCount: 0 });

    const stats = await backfillMusicArtistFromAlbum();

    expect(stats.updated).toBe(0);
    expect(stats.skippedAlreadySet).toBe(1);
  });
});
