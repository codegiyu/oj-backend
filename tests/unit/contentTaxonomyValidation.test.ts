import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/utils/AppError';
import {
  assertNewsPriority,
  assertPublishableContentTaxonomy,
  normalizeTags,
} from '../../src/utils/contentTaxonomyValidation';

const findOneMock = vi.fn();

vi.mock('../../src/models/contentCategory', () => ({
  ContentCategory: {
    findOne: (...args: unknown[]) => findOneMock(...args),
  },
}));

describe('contentTaxonomyValidation', () => {
  beforeEach(() => {
    findOneMock.mockReset();
    findOneMock.mockReturnValue({
      select: () => ({
        lean: () => Promise.resolve({ _id: 'cat1' }),
      }),
    });
  });

  describe('assertNewsPriority', () => {
    it('defaults to 1 when priority is omitted', () => {
      expect(assertNewsPriority(undefined)).toBe(1);
      expect(assertNewsPriority(null)).toBe(1);
    });

    it('accepts integers 1 through 5', () => {
      expect(assertNewsPriority(3)).toBe(3);
      expect(assertNewsPriority('5')).toBe(5);
    });

    it('rejects out-of-range priority', () => {
      expect(() => assertNewsPriority(0)).toThrow(AppError);
      expect(() => assertNewsPriority(6)).toThrow(AppError);
      expect(() => assertNewsPriority(2.5)).toThrow(AppError);
    });
  });

  describe('normalizeTags', () => {
    it('returns undefined when tags are not provided', () => {
      expect(normalizeTags(undefined)).toBeUndefined();
    });

    it('trims, dedupes, and drops empty tags', () => {
      expect(normalizeTags([' gospel ', 'gospel', '', '  '])).toEqual(['gospel']);
    });

    it('rejects non-array tags', () => {
      expect(() => normalizeTags('gospel')).toThrow(AppError);
    });
  });

  describe('assertPublishableContentTaxonomy', () => {
    it('skips validation for non-published status', async () => {
      await assertPublishableContentTaxonomy({
        scope: 'music',
        status: 'draft',
        category: '',
      });

      expect(findOneMock).not.toHaveBeenCalled();
    });

    it('requires category for published content', async () => {
      await expect(
        assertPublishableContentTaxonomy({
          scope: 'news',
          status: 'published',
          category: '   ',
        })
      ).rejects.toThrow(/Category is required/);
    });

    it('requires an active category slug for published content', async () => {
      findOneMock.mockReturnValue({
        select: () => ({
          lean: () => Promise.resolve(null),
        }),
      });

      await expect(
        assertPublishableContentTaxonomy({
          scope: 'video',
          status: 'published',
          category: 'unknown-slug',
        })
      ).rejects.toThrow(/active content category/);
    });

    it('passes when category matches an active slug', async () => {
      await expect(
        assertPublishableContentTaxonomy({
          scope: 'music',
          status: 'published',
          category: 'worship',
        })
      ).resolves.toBeUndefined();

      expect(findOneMock).toHaveBeenCalledWith({
        scope: 'music',
        slug: 'worship',
        isActive: true,
      });
    });
  });
});
