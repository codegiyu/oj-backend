import { describe, expect, it } from 'vitest';
import { shapeMusicItem } from '../../src/services/adminMusic.service';
import {
  MOCK_ALBUM_IDS,
  MOCK_ARTIST_IDS,
  MOCK_TRACK_IDS,
  mockAlbumSummary,
  mockArtistSummary,
} from '../helpers/albumMusicFixtures';

describe('adminMusic.service shapeMusicItem album', () => {
  it('includes populated album summary and albumId', () => {
    const shaped = shapeMusicItem({
      _id: MOCK_TRACK_IDS.primary,
      title: 'Track One',
      slug: 'track-one',
      status: 'published',
      artist: mockArtistSummary,
      album: mockAlbumSummary,
    });

    expect(shaped.albumId).toBe(MOCK_ALBUM_IDS.primary);
    expect(shaped.album).toEqual(mockAlbumSummary);
    expect(shaped.artist).toEqual(mockArtistSummary);
  });

  it('includes albumId only when album is an unpopulated ref', () => {
    const shaped = shapeMusicItem({
      _id: MOCK_TRACK_IDS.primary,
      title: 'Track One',
      slug: 'track-one',
      status: 'published',
      artist: MOCK_ARTIST_IDS.primary,
      album: MOCK_ALBUM_IDS.primary,
    });

    expect(shaped.albumId).toBe(MOCK_ALBUM_IDS.primary);
    expect(shaped.album).toBeUndefined();
  });
});
