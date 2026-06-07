import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';

describe('public list query validation', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 400 for invalid sort on GET /public/music', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${API_V1_PREFIX}/public/music?sort=invalid`,
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for invalid sort on GET /public/devotionals', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${API_V1_PREFIX}/public/devotionals?sort=invalid`,
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for invalid sort on GET /public/resources', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${API_V1_PREFIX}/public/resources?sort=invalid`,
    });

    expect(response.statusCode).toBe(400);
  });
});
