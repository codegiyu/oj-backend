import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';

const STAFF_BASE = `${API_V1_PREFIX}/admin/staff`;

describe('admin staff routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for GET /admin/staff without credentials', async () => {
    const response = await app.inject({ method: 'GET', url: `${STAFF_BASE}?page=1&limit=12` });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 for POST /admin/staff/invite without credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${STAFF_BASE}/invite`,
      payload: {
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'Admin',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 for POST /admin/staff/:id/reinvite without credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${STAFF_BASE}/507f1f77bcf86cd799439011/reinvite`,
    });

    expect(response.statusCode).toBe(401);
  });
});
