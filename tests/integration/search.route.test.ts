import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';
import {
  buildSearchPagination,
  SEARCH_PER_TYPE_LIMIT,
} from '../../src/services/publicSearch.service';

vi.mock('../../src/services/publicSearch.service', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/services/publicSearch.service')>();

  return {
    ...actual,
    runPublicSearch: vi.fn(actual.runPublicSearch),
  };
});

import * as publicSearchService from '../../src/services/publicSearch.service';

describe('GET /public/search', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns empty results with honest pagination when q is empty', async () => {
    vi.mocked(publicSearchService.runPublicSearch).mockResolvedValueOnce({
      results: [],
      pagination: buildSearchPagination(0, 1, 24, 0),
    });

    const response = await app.inject({
      method: 'GET',
      url: `${API_V1_PREFIX}/public/search`,
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      data?: {
        results: unknown[];
        pagination: { loaded: number; totalPages: number; isCapped: boolean };
      };
    };

    expect(body.data?.results).toEqual([]);
    expect(body.data?.pagination).toMatchObject({
      loaded: 0,
      totalPages: 0,
      isCapped: false,
    });
  });

  it('returns capped pagination metadata for full-type search', async () => {
    const loaded = 11 * SEARCH_PER_TYPE_LIMIT;
    vi.mocked(publicSearchService.runPublicSearch).mockResolvedValueOnce({
      results: [],
      pagination: buildSearchPagination(loaded, 1, 10, 11),
    });

    const response = await app.inject({
      method: 'GET',
      url: `${API_V1_PREFIX}/public/search?q=gospel&page=1&limit=10`,
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      data?: {
        pagination: {
          page: number;
          limit: number;
          loaded: number;
          totalPages: number;
          isCapped: boolean;
        };
      };
    };

    const pagination = body.data?.pagination;
    expect(pagination).toEqual({
      page: 1,
      limit: 10,
      loaded,
      totalPages: Math.ceil(loaded / 10),
      isCapped: true,
    });
  });
});
