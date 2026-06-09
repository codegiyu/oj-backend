import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';
import { AppError } from '../../src/utils/AppError';
import { buildClientAccessAuthHeader } from '../helpers/auth';

vi.mock('../../src/services/marketplace.service', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/services/marketplace.service')>();

  return {
    ...actual,
    loadCategories: vi.fn(actual.loadCategories),
    loadVendorBySlug: vi.fn(actual.loadVendorBySlug),
    listMarketplaceVendors: vi.fn(actual.listMarketplaceVendors),
    listMarketplaceProducts: vi.fn(actual.listMarketplaceProducts),
    listMyMarketplaceOrders: vi.fn(actual.listMyMarketplaceOrders),
  };
});

import * as marketplaceService from '../../src/services/marketplace.service';

const MARKETPLACE_BASE = `${API_V1_PREFIX}/marketplace`;

describe('marketplace routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 for GET /marketplace/categories', async () => {
    vi.mocked(marketplaceService.loadCategories).mockResolvedValueOnce({ categories: [] });

    const response = await app.inject({ method: 'GET', url: `${MARKETPLACE_BASE}/categories` });

    expect(response.statusCode).toBe(200);

    const body = response.json() as { data?: { categories?: unknown[] } };

    expect(body.data?.categories).toEqual([]);
  });

  it('returns paginated vendors from service layer', async () => {
    vi.mocked(marketplaceService.listMarketplaceVendors).mockResolvedValueOnce({
      vendors: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `${MARKETPLACE_BASE}/vendors?page=1&limit=20`,
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      data?: { vendors?: unknown[]; pagination?: { page: number } };
    };

    expect(body.data?.vendors).toEqual([]);
    expect(body.data?.pagination?.page).toBe(1);
  });

  it('returns paginated products from service layer', async () => {
    vi.mocked(marketplaceService.listMarketplaceProducts).mockResolvedValueOnce({
      products: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `${MARKETPLACE_BASE}/products?page=1&limit=20`,
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      data?: { products?: unknown[]; pagination?: { page: number } };
    };

    expect(body.data?.products).toEqual([]);
    expect(body.data?.pagination?.page).toBe(1);
  });

  it('returns 401 for GET /marketplace/orders without credentials', async () => {
    const response = await app.inject({ method: 'GET', url: `${MARKETPLACE_BASE}/orders` });

    expect(response.statusCode).toBe(401);
  });

  it('returns paginated orders from service layer when authenticated', async () => {
    vi.mocked(marketplaceService.listMyMarketplaceOrders).mockResolvedValueOnce({
      orders: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `${MARKETPLACE_BASE}/orders?page=1&limit=20`,
      headers: buildClientAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      data?: { orders?: unknown[]; pagination?: { page: number } };
    };

    expect(body.data?.orders).toEqual([]);
    expect(body.data?.pagination?.page).toBe(1);
  });

  it('returns 404 when vendor slug is not found', async () => {
    vi.mocked(marketplaceService.loadVendorBySlug).mockRejectedValueOnce(
      new AppError('Vendor not found', 404)
    );

    const response = await app.inject({
      method: 'GET',
      url: `${MARKETPLACE_BASE}/vendors/missing-vendor`,
    });

    expect(response.statusCode).toBe(404);
  });
});
