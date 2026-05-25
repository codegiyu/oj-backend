import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';

const USERS_BASE = `${API_V1_PREFIX}/admin/users`;

describe('admin users routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for GET /admin/users list without credentials', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${USERS_BASE}?page=1&limit=12&search=test&status=active&sort=-createdAt`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 for GET /admin/users search without credentials', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${USERS_BASE}?search=test&limit=20`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 for GET /admin/users/:id without credentials', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${USERS_BASE}/507f1f77bcf86cd799439011`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 for PATCH /admin/users/:id without credentials', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `${USERS_BASE}/507f1f77bcf86cd799439011`,
      payload: { accountStatus: 'suspended' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 for POST approve-deletion without credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${USERS_BASE}/507f1f77bcf86cd799439011/approve-deletion`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 for POST reject-deletion without credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${USERS_BASE}/507f1f77bcf86cd799439011/reject-deletion`,
    });

    expect(response.statusCode).toBe(401);
  });
});
