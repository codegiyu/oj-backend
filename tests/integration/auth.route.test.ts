import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('protected admin routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for GET /admin/me without credentials', async () => {
    const response = await app.inject({ method: 'GET', url: '/admin/me' });

    expect(response.statusCode).toBe(401);

    const body = response.json() as { success?: boolean; message?: string; error?: string };

    expect(body.success ?? false).toBe(false);
    expect(String(body.message ?? body.error ?? '')).toMatch(/unauthorized/i);
  });
});
