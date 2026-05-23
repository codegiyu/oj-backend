import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('user favorites routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for GET /user/favorites without credentials', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/user/favorites' });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 for POST /user/favorites without credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/user/favorites',
      payload: { entityType: 'music', entityId: '507f1f77bcf86cd799439011' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 for DELETE /user/favorites/:entityType/:entityId without credentials', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/user/favorites/music/507f1f77bcf86cd799439011',
    });

    expect(response.statusCode).toBe(401);
  });
});
