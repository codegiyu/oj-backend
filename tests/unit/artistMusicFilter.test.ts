import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import {
  MOCK_ALBUM_IDS,
  MOCK_ARTIST_IDS,
  toObjectId,
} from '../helpers/albumMusicFixtures';

const { albumFind, albumDistinct } = vi.hoisted(() => ({
  albumFind: vi.fn(),
  albumDistinct: vi.fn(),
}));

vi.mock('../../src/models/album', () => ({
  Album: {
    find: albumFind,
  },
}));

import {
  applyArtistMusicScopeToFilter,
  buildArtistMusicScopeClause,
  buildArtistMusicScopeClauseForMany,
  fetchPublishedAlbumIdsForArtist,
} from '../../src/utils/artistMusicFilter';

describe('artistMusicFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    albumFind.mockReturnValue({ distinct: albumDistinct } as never);
  });

  it('buildArtistMusicScopeClause includes direct artist and album links', () => {
    const artistId = toObjectId(MOCK_ARTIST_IDS.primary);
    const albumId = toObjectId(MOCK_ALBUM_IDS.primary);

    expect(buildArtistMusicScopeClause(artistId, [albumId])).toEqual({
      $or: [{ artist: artistId }, { album: { $in: [albumId] } }],
    });
  });

  it('buildArtistMusicScopeClauseForMany supports batch artist stats', () => {
    const artistIds = [toObjectId(MOCK_ARTIST_IDS.primary), toObjectId(MOCK_ARTIST_IDS.alternate)];
    const albumId = toObjectId(MOCK_ALBUM_IDS.primary);

    expect(buildArtistMusicScopeClauseForMany(artistIds, [albumId])).toEqual({
      $or: [{ artist: { $in: artistIds } }, { album: { $in: [albumId] } }],
    });
  });

  it('fetchPublishedAlbumIdsForArtist loads published albums for an artist', async () => {
    const artistId = toObjectId(MOCK_ARTIST_IDS.primary);
    const albumId = toObjectId(MOCK_ALBUM_IDS.primary);
    albumDistinct.mockResolvedValue([albumId] as never);

    const albumIds = await fetchPublishedAlbumIdsForArtist(artistId);

    expect(albumFind).toHaveBeenCalledWith({ artist: artistId, status: 'published' });
    expect(albumIds).toEqual([albumId]);
  });

  it('applyArtistMusicScopeToFilter merges artist scope into an existing filter', async () => {
    const artistId = new mongoose.Types.ObjectId(MOCK_ARTIST_IDS.primary);
    albumDistinct.mockResolvedValue([] as never);

    const filter = await applyArtistMusicScopeToFilter({ status: 'published' }, artistId);

    expect(filter).toEqual({
      status: 'published',
      $or: [{ artist: artistId }],
    });
  });
});
