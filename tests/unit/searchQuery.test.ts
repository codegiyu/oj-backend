import { describe, expect, it } from 'vitest';
import {
  buildTextSearchClause,
  mergeSearchIntoFilter,
  sanitizeTextSearchQuery,
  shouldUseTextSearch,
} from '../../src/utils/searchQuery';

describe('searchQuery', () => {
  it('sanitizes unsafe characters from text search input', () => {
    expect(sanitizeTextSearchQuery('  hello@world!  ')).toBe('hello world');
  });

  it('uses $text when at least one token is long enough', () => {
    expect(shouldUseTextSearch('gospel')).toBe(true);
    expect(buildTextSearchClause('gospel worship')).toEqual({
      $text: { $search: 'gospel worship' },
    });
  });

  it('falls back to regex for very short queries', () => {
    expect(shouldUseTextSearch('ab')).toBe(false);

    const filter = mergeSearchIntoFilter({ status: 'published' }, 'ab', ['title', 'description']);

    expect(filter).toMatchObject({
      $and: expect.arrayContaining([
        { status: 'published' },
        {
          $or: [{ title: expect.any(RegExp) }, { description: expect.any(RegExp) }],
        },
      ]),
    });
    expect(filter).not.toHaveProperty('$text');
  });
});
