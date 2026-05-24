import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';

describe('admin albums routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for GET /admin/albums without credentials', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${API_V1_PREFIX}/admin/albums`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 for POST /admin/albums without credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${API_V1_PREFIX}/admin/albums`,
      payload: { title: 'Test Album' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 for DELETE /admin/albums/:id without credentials', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `${API_V1_PREFIX}/admin/albums/507f1f77bcf86cd799439011`,
    });

    expect(response.statusCode).toBe(401);
  });
});
