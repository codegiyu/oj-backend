import { describe, expect, it } from 'vitest';
import {
  applyFeaturedListFilter,
  applyTextSearch,
  escapeRegex,
  isDevotionalSortType,
  parseListQueryParams,
  parseListSort,
  resolveListSortOptions,
  withPopularSortField,
} from '../../src/utils/publicListQuery';

describe('publicListQuery', () => {
  describe('escapeRegex', () => {
    it('escapes regex metacharacters', () => {
      expect(escapeRegex('a+b(c)?')).toBe('a\\+b\\(c\\)\\?');
    });
  });

  describe('applyTextSearch', () => {
    it('returns filter unchanged when q is too short', () => {
      const filter = { status: 'published' };
      expect(applyTextSearch(filter, 'a', ['title'])).toEqual(filter);
    });

    it('adds escaped OR regex across fields', () => {
      const result = applyTextSearch({}, 'hello', ['title', 'excerpt']);

      expect(result).toEqual({
        $or: [
          { title: { $regex: 'hello', $options: 'i' } },
          { excerpt: { $regex: 'hello', $options: 'i' } },
        ],
      });
    });

    it('merges search with an existing filter via $and', () => {
      const result = applyTextSearch({ status: 'published' }, 'grace', ['title']);

      expect(result).toEqual({
        $and: [{ status: 'published' }, { $or: [{ title: { $regex: 'grace', $options: 'i' } }] }],
      });
    });
  });

  describe('parseListSort', () => {
    it('defaults to newest', () => {
      expect(parseListSort(undefined)).toBe('newest');
      expect(parseListSort('invalid')).toBe('newest');
    });

    it('accepts popular and featured', () => {
      expect(parseListSort('popular')).toBe('popular');
      expect(parseListSort('featured')).toBe('featured');
    });
  });

  describe('resolveListSortOptions', () => {
    it('returns featured filter metadata for featured sort', () => {
      expect(resolveListSortOptions('featured')).toEqual({
        sort: { displayOrder: 1, createdAt: -1 },
        featuredFilter: true,
      });
    });

    it('marks popular sort as non-trending', () => {
      expect(resolveListSortOptions('popular')).toEqual({
        sort: { createdAt: -1 },
        useTrending: false,
      });
    });
  });

  describe('withPopularSortField', () => {
    it('sorts by engagement field then createdAt', () => {
      expect(withPopularSortField({ createdAt: -1 }, 'plays')).toEqual({
        plays: -1,
        createdAt: -1,
      });
    });
  });

  describe('applyFeaturedListFilter', () => {
    it('adds isFeatured when sort preset is featured', () => {
      const result = applyFeaturedListFilter({ status: 'published' }, 'featured');

      expect(result).toEqual({
        $and: [{ status: 'published' }, { isFeatured: true }],
      });
    });
  });

  describe('parseListQueryParams', () => {
    it('parses pagination, search, and sort', () => {
      const result = parseListQueryParams({
        q: '  worship  ',
        sort: 'popular',
        page: '2',
        limit: '24',
      });

      expect(result).toMatchObject({
        q: 'worship',
        sort: 'popular',
        sortPreset: 'popular',
        page: 2,
        limit: 24,
        skip: 24,
      });
    });
  });

  describe('isDevotionalSortType', () => {
    it('identifies latest and popular as sort-only types', () => {
      expect(isDevotionalSortType('latest')).toBe(true);
      expect(isDevotionalSortType('popular')).toBe(true);
      expect(isDevotionalSortType('daily')).toBe(false);
    });
  });
});
