import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';
import { Vendor } from '../../src/models/vendor';
import { Product } from '../../src/models/product';
import { Order } from '../../src/models/order';
import {
  clearCollections,
  connectTestMongo,
  disconnectTestMongo,
} from '../helpers/mongoIntegration';

const ORDERS_URL = `${API_V1_PREFIX}/marketplace/orders`;

vi.mock('../../src/queues/main.queue', () => ({
  addJobToQueue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/frontendRevalidation.service', () => ({
  schedulePublishedContentRevalidation: vi.fn(),
  scheduleFrontendRevalidation: vi.fn(),
}));

describe('POST /marketplace/orders (Mongo integration)', () => {
  let app: FastifyInstance;
  let mongoAvailable = false;
  let vendorId: mongoose.Types.ObjectId;
  let productId: mongoose.Types.ObjectId;

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

    await clearCollections(['orders', 'products', 'vendors']);

    const vendor = await Vendor.create({
      name: 'Integration Vendor',
      slug: `vendor-${Date.now()}`,
      email: 'vendor-int@test.com',
      phone: '+2348011111111',
      storeName: 'Integration Store',
      status: 'active',
    });
    vendorId = vendor._id;

    const product = await Product.create({
      name: 'Integration Product',
      slug: `product-${Date.now()}`,
      vendor: vendorId,
      price: 2500,
      status: 'published',
      inStock: true,
    });
    productId = product._id;
  });

  it('creates an order when price matches published product', async () => {
    if (!mongoAvailable) return;

    const response = await app.inject({
      method: 'POST',
      url: ORDERS_URL,
      payload: {
        customer: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+2348022222222',
          address: '12 Test Street',
        },
        items: [
          {
            productId: productId.toString(),
            quantity: 2,
            price: 2500,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data?.orders?.length).toBeGreaterThanOrEqual(1);

    const orderCount = await Order.countDocuments({ vendor: vendorId });
    expect(orderCount).toBe(1);
  });

  it('returns 400 when submitted price does not match product price', async () => {
    if (!mongoAvailable) return;

    const response = await app.inject({
      method: 'POST',
      url: ORDERS_URL,
      payload: {
        customer: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '+2348022222222',
          address: '12 Test Street',
        },
        items: [
          {
            productId: productId.toString(),
            quantity: 1,
            price: 1,
          },
        ],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(await Order.countDocuments()).toBe(0);
  });
});
