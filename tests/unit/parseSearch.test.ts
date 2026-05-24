import { describe, expect, it } from 'vitest';
import { parseSearch } from '../../src/utils/helpers';

describe('parseSearch', () => {
  it('returns undefined for empty or single-char input', () => {
    expect(parseSearch('')).toBeUndefined();
    expect(parseSearch('  ')).toBeUndefined();
    expect(parseSearch('a')).toBeUndefined();
  });

  it('returns trimmed search when length is at least 2', () => {
    expect(parseSearch('  ab  ')).toBe('ab');
  });

  it('caps search length at 100 characters', () => {
    const long = 'x'.repeat(150);
    const result = parseSearch(long);
    expect(result).toHaveLength(100);
  });
});
