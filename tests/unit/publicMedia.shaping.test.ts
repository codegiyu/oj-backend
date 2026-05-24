import { describe, expect, it } from 'vitest';
import { shapeMusicDetail, shapeMusicListItem } from '../../src/services/publicMedia.shaping';
import { mockAlbumSummary, MOCK_ALBUM_IDS, MOCK_TRACK_IDS } from '../helpers/albumMusicFixtures';

describe('publicMedia.shaping music album', () => {
  it('shapeMusicListItem includes published album summary', () => {
    const shaped = shapeMusicListItem(
      {
        _id: MOCK_TRACK_IDS.primary,
        title: 'Track One',
        slug: 'track-one',
        coverImage: '/cover.jpg',
        album: { ...mockAlbumSummary, status: 'published' },
      },
      0,
      'recent'
    );

    expect(shaped.albumId).toBe(MOCK_ALBUM_IDS.primary);
    expect(shaped.album).toEqual(mockAlbumSummary);
  });

  it('shapeMusicListItem omits draft albums from public responses', () => {
    const shaped = shapeMusicListItem(
      {
        _id: MOCK_TRACK_IDS.primary,
        title: 'Track One',
        slug: 'track-one',
        album: { ...mockAlbumSummary, status: 'draft' },
      },
      0,
      'recent'
    );

    expect(shaped.album).toBeUndefined();
    expect(shaped.albumId).toBeUndefined();
  });

  it('shapeMusicDetail includes published album summary', () => {
    const shaped = shapeMusicDetail({
      _id: MOCK_TRACK_IDS.primary,
      title: 'Track One',
      slug: 'track-one',
      album: { ...mockAlbumSummary, status: 'published' },
    });

    expect(shaped.albumId).toBe(MOCK_ALBUM_IDS.primary);
    expect(shaped.album).toEqual(mockAlbumSummary);
  });
});
