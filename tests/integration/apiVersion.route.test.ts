import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';

describe('API v1 routing', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps health probes unversioned', async () => {
    const health = await app.inject({ method: 'GET', url: '/health' });
    const ready = await app.inject({ method: 'GET', url: '/ready' });

    expect(health.statusCode).toBe(200);
    expect(ready.statusCode).toBeGreaterThanOrEqual(200);
    expect(ready.statusCode).toBeLessThan(600);
  });

  it('does not serve legacy unversioned business routes', async () => {
    const legacyPublic = await app.inject({ method: 'GET', url: '/public/music' });
    const legacyAdmin = await app.inject({ method: 'GET', url: '/admin/me' });

    expect(legacyPublic.statusCode).toBe(404);
    expect(legacyAdmin.statusCode).toBe(404);
  });

  it('registers versioned public routes under the v1 prefix', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${API_V1_PREFIX}/public/music?page=not-a-number`,
    });

    expect(response.statusCode).toBe(400);
  });
});
