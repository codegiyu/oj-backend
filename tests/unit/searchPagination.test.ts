import { describe, expect, it } from 'vitest';
import {
  buildSearchPagination,
  SEARCH_PER_TYPE_LIMIT,
} from '../../src/services/publicSearch.service';

describe('buildSearchPagination', () => {
  it('reports loaded count and capped flag honestly', () => {
    const pagination = buildSearchPagination(60, 2, 24, 3);

    expect(pagination).toEqual({
      page: 2,
      limit: 24,
      loaded: 60,
      totalPages: 3,
      isCapped: false,
    });
  });

  it('marks pagination as capped when loaded hits per-type ceiling', () => {
    const typeCount = 4;
    const loaded = typeCount * SEARCH_PER_TYPE_LIMIT;
    const pagination = buildSearchPagination(loaded, 1, 24, typeCount);

    expect(pagination.isCapped).toBe(true);
    expect(pagination.loaded).toBe(loaded);
  });

  it('returns zero pages when nothing was loaded', () => {
    const pagination = buildSearchPagination(0, 1, 24, 5);

    expect(pagination.totalPages).toBe(0);
    expect(pagination.isCapped).toBe(false);
  });

  it('does not mark empty search as capped when no types were queried', () => {
    const pagination = buildSearchPagination(0, 1, 24, 0);

    expect(pagination.isCapped).toBe(false);
  });
});
