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

  it('returns typed search results from the service layer', async () => {
    vi.mocked(publicSearchService.runPublicSearch).mockResolvedValueOnce({
      results: [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Gospel Song',
          subtitle: 'Test Artist',
          type: 'music',
          meta: '120',
        },
        {
          _id: '507f1f77bcf86cd799439012',
          title: 'Worship Album',
          subtitle: 'Test Artist',
          type: 'album',
          image: 'https://cdn.example/cover.jpg',
          meta: '',
        },
      ],
      pagination: buildSearchPagination(2, 1, 24, 2),
    });

    const response = await app.inject({
      method: 'GET',
      url: `${API_V1_PREFIX}/public/search?q=gospel&type=music`,
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      data?: {
        results: Array<{ type: string; title: string }>;
        pagination: { loaded: number; isCapped: boolean };
      };
    };

    expect(body.data?.results).toHaveLength(2);
    expect(body.data?.results[0]?.type).toBe('music');
    expect(body.data?.results[1]?.type).toBe('album');
    expect(body.data?.pagination).toMatchObject({ loaded: 2, isCapped: false });
    expect(publicSearchService.runPublicSearch).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'gospel', typeFilter: 'music', page: 1, limit: 24 })
    );
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
