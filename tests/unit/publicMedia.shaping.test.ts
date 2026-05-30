import { describe, expect, it } from 'vitest';
import {
  shapeArticleDetail,
  shapeArticleListItem,
  shapeMusicDetail,
  shapeMusicListItem,
  shapeVideoDetail,
  shapeVideoListItem,
} from '../../src/services/publicMedia.shaping';
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

describe('publicMedia.shaping taxonomy fields', () => {
  it('shapeMusicDetail exposes tags and duration from metadata', () => {
    const shaped = shapeMusicDetail({
      _id: MOCK_TRACK_IDS.primary,
      title: 'Track',
      slug: 'track',
      tags: ['worship', 'live'],
      metadata: { durationSeconds: 245 },
    });

    expect(shaped.tags).toEqual(['worship', 'live']);
    expect(shaped.duration).toBe(245);
  });

  it('shapeVideoListItem exposes duration from metadata', () => {
    const shaped = shapeVideoListItem({
      _id: 'vid1',
      title: 'Clip',
      slug: 'clip',
      metadata: { durationSeconds: 60 },
    });

    expect(shaped.duration).toBe(60);
  });

  it('shapeArticleListItem exposes priority and tags', () => {
    const shaped = shapeArticleListItem({
      _id: 'news1',
      title: 'Headline',
      slug: 'headline',
      tags: ['breaking'],
      priority: 5,
    });

    expect(shaped.tags).toEqual(['breaking']);
    expect(shaped.priority).toBe(5);
  });

  it('shapeArticleDetail exposes priority', () => {
    const shaped = shapeArticleDetail({
      _id: 'news1',
      title: 'Headline',
      slug: 'headline',
      priority: 4,
    });

    expect(shaped.priority).toBe(4);
  });
});
