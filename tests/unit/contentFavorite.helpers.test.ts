import { describe, expect, it } from 'vitest';
import {
  buildContentFavoriteHref,
  contentFavoriteKey,
  isContentFavoriteEntityType,
} from '../../src/services/contentFavorite.helpers';

describe('contentFavorite.helpers', () => {
  it('validates entity types', () => {
    expect(isContentFavoriteEntityType('music')).toBe(true);
    expect(isContentFavoriteEntityType('product')).toBe(false);
  });

  it('builds stable favorite keys', () => {
    expect(contentFavoriteKey('video', '507f1f77bcf86cd799439011')).toBe(
      'video:507f1f77bcf86cd799439011'
    );
  });

  it('builds hrefs per content type', () => {
    expect(buildContentFavoriteHref('music', 'id1', 'my-track')).toBe('/music/my-track');
    expect(buildContentFavoriteHref('video', 'id2')).toBe('/videos/id2');
    expect(buildContentFavoriteHref('news', 'id3', 'ignored-slug')).toBe('/news/story/id3');
    expect(buildContentFavoriteHref('devotional', 'id4', 'daily-word')).toBe(
      '/community/devotionals/daily-word'
    );
  });
});
