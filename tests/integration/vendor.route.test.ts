import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';
import { AppError } from '../../src/utils/AppError';
import { buildClientAccessAuthHeader } from '../helpers/auth';

vi.mock('../../src/services/vendor.service', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/services/vendor.service')>();

  return {
    ...actual,
    loadVendorMe: vi.fn(actual.loadVendorMe),
    loadVendorDashboardStats: vi.fn(actual.loadVendorDashboardStats),
    listVendorProducts: vi.fn(actual.listVendorProducts),
    listVendorOrders: vi.fn(actual.listVendorOrders),
  };
});

import * as vendorService from '../../src/services/vendor.service';

const VENDOR_BASE = `${API_V1_PREFIX}/vendor`;

describe('vendor portal routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for GET /vendor/me without credentials', async () => {
    const response = await app.inject({ method: 'GET', url: `${VENDOR_BASE}/me` });

    expect(response.statusCode).toBe(401);
  });

  it('returns 403 for GET /vendor/me when user has no vendor profile', async () => {
    vi.mocked(vendorService.loadVendorMe).mockRejectedValueOnce(
      new AppError('You do not have an associated vendor profile', 403)
    );

    const response = await app.inject({
      method: 'GET',
      url: `${VENDOR_BASE}/me`,
      headers: buildClientAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 200 for GET /vendor/me with stringified vendor id fields', async () => {
    vi.mocked(vendorService.loadVendorMe).mockResolvedValueOnce({
      _id: '507f1f77bcf86cd799439011',
      name: 'Grace Store',
      slug: 'grace-store',
      storeName: 'Grace Store',
      email: 'vendor@example.com',
      phone: '+2348000000000',
      status: 'active',
      portalStatus: 'active',
      productCount: 3,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      openAppeal: null,
      lastRejectedAppeal: null,
    });

    const response = await app.inject({
      method: 'GET',
      url: `${VENDOR_BASE}/me`,
      headers: buildClientAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      data?: { _id?: unknown; createdAt?: unknown; productCount?: number };
    };

    expect(typeof body.data?._id).toBe('string');
    expect(body.data?._id).toBe('507f1f77bcf86cd799439011');
    expect(typeof body.data?.createdAt).toBe('string');
    expect(body.data?.productCount).toBe(3);
  });

  it('returns 200 for GET /vendor/dashboard-stats when service succeeds', async () => {
    vi.mocked(vendorService.loadVendorDashboardStats).mockResolvedValueOnce({
      productsCount: 5,
      pendingOrdersCount: 2,
      totalPaidRevenue: 15000,
    });

    const response = await app.inject({
      method: 'GET',
      url: `${VENDOR_BASE}/dashboard-stats`,
      headers: buildClientAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as { data?: { productsCount?: number } };

    expect(body.data?.productsCount).toBe(5);
  });

  it('returns paginated products list from service layer', async () => {
    vi.mocked(vendorService.listVendorProducts).mockResolvedValueOnce({
      products: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `${VENDOR_BASE}/products?page=1&limit=10`,
      headers: buildClientAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      data?: { products?: unknown[]; pagination?: { page: number } };
    };

    expect(body.data?.products).toEqual([]);
    expect(body.data?.pagination?.page).toBe(1);
  });

  it('returns paginated orders list from service layer', async () => {
    vi.mocked(vendorService.listVendorOrders).mockResolvedValueOnce({
      orders: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    const response = await app.inject({
      method: 'GET',
      url: `${VENDOR_BASE}/orders?page=1&limit=10`,
      headers: buildClientAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      data?: { orders?: unknown[]; pagination?: { page: number } };
    };

    expect(body.data?.orders).toEqual([]);
    expect(body.data?.pagination?.page).toBe(1);
  });
});
