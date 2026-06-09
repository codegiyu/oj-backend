import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env', () => ({
  ENVIRONMENT: { search: { useAtlasSearch: false } },
}));

describe('atlasSearch.service', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('returns null when USE_ATLAS_SEARCH is disabled', async () => {
    const { runAtlasBackedSearch } = await import('../../src/services/atlasSearch.service');

    const result = await runAtlasBackedSearch({ q: 'gospel', page: 1, limit: 24 });

    expect(result).toBeNull();
  });

  it('forces text-search path when USE_ATLAS_SEARCH is enabled', async () => {
    vi.doMock('../../src/config/env', () => ({
      ENVIRONMENT: { search: { useAtlasSearch: true } },
    }));

    const runPublicSearch = vi.fn().mockResolvedValue({
      results: [],
      pagination: { page: 1, limit: 24, loaded: 0, totalPages: 0, isCapped: false },
    });

    vi.doMock('../../src/services/publicSearch.service', () => ({
      runPublicSearch,
    }));

    const { runAtlasBackedSearch } = await import('../../src/services/atlasSearch.service');

    await runAtlasBackedSearch({ q: 'worship music', page: 1, limit: 24 });

    expect(runPublicSearch).toHaveBeenCalledWith({
      q: 'worship music',
      page: 1,
      limit: 24,
      forceTextSearch: true,
    });
  });
});
