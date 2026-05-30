import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { buildAccessAuthHeader } from '../helpers/auth';

const BECOME_VENDOR_URL = '/api/v1/marketplace/become-vendor';

const validPayload = {
  storeName: 'Test Store',
  email: 'vendor@example.com',
  phone: '+2348000000000',
};

describe('POST /marketplace/become-vendor', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 without credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: BECOME_VENDOR_URL,
      payload: validPayload,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 when access token scope is console-access', async () => {
    const response = await app.inject({
      method: 'POST',
      url: BECOME_VENDOR_URL,
      headers: buildAccessAuthHeader('console-access', { email: 'admin@example.com' }),
      payload: validPayload,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 400 when body omits required storeName', async () => {
    const response = await app.inject({
      method: 'POST',
      url: BECOME_VENDOR_URL,
      payload: { email: 'vendor@example.com', phone: '+2348000000000' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when body omits required email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: BECOME_VENDOR_URL,
      payload: { storeName: 'Test Store', phone: '+2348000000000' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when body omits required phone', async () => {
    const response = await app.inject({
      method: 'POST',
      url: BECOME_VENDOR_URL,
      payload: { storeName: 'Test Store', email: 'vendor@example.com' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 when email format is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: BECOME_VENDOR_URL,
      payload: { ...validPayload, email: 'not-an-email' },
    });

    expect(response.statusCode).toBe(400);
  });
});
