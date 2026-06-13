import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';
import { buildAccessAuthHeader } from '../helpers/auth';
import { Vendor } from '../../src/models/vendor';
import { Product } from '../../src/models/product';
import {
  clearCollections,
  connectTestMongo,
  disconnectTestMongo,
} from '../helpers/mongoIntegration';

const PRODUCTS_BASE = `${API_V1_PREFIX}/admin/products`;

vi.mock('../../src/services/adminPermission.service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../../src/services/adminPermission.service')>();

  return {
    ...actual,
    adminHasRequiredPermissions: vi.fn().mockResolvedValue(true),
  };
});

vi.mock('../../src/services/frontendRevalidation.service', () => ({
  schedulePublishedContentRevalidation: vi.fn(),
  scheduleFrontendRevalidation: vi.fn(),
}));

vi.mock('../../src/services/relatedProductsLoader.service', () => ({
  invalidateRelatedProductsCache: vi.fn(),
}));

describe('admin products routes (Mongo integration)', () => {
  let app: FastifyInstance;
  let mongoAvailable = false;
  let vendorId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    mongoAvailable = await connectTestMongo();
    if (!mongoAvailable) return;

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    await disconnectTestMongo();
  });

  beforeEach(async () => {
    if (!mongoAvailable) return;

    await clearCollections(['products', 'vendors']);

    const vendor = await Vendor.create({
      name: 'Admin Test Vendor',
      slug: `admin-vendor-${Date.now()}`,
      email: 'admin-vendor@test.com',
      phone: '+2348033333333',
      storeName: 'Admin Vendor Store',
      status: 'active',
    });
    vendorId = vendor._id;
  });

  it('lists products from Mongo after create', async () => {
    if (!mongoAvailable) return;

    const createResponse = await app.inject({
      method: 'POST',
      url: PRODUCTS_BASE,
      headers: buildAccessAuthHeader('console-access', {
        userId: '507f1f77bcf86cd799439099',
        email: 'admin@example.com',
      }),
      payload: {
        name: 'Mongo Integration Product',
        vendorId: vendorId.toString(),
        price: 1500,
        status: 'draft',
      },
    });

    expect(createResponse.statusCode).toBe(201);

    const listResponse = await app.inject({
      method: 'GET',
      url: `${PRODUCTS_BASE}?page=1&limit=10`,
      headers: buildAccessAuthHeader('console-access', {
        userId: '507f1f77bcf86cd799439099',
        email: 'admin@example.com',
      }),
    });

    expect(listResponse.statusCode).toBe(200);
    const body = listResponse.json();
    expect(body.success).toBe(true);
    expect(body.data?.products?.length).toBeGreaterThanOrEqual(1);
    expect(body.data?.products?.[0]?.name).toBe('Mongo Integration Product');
  });
});
