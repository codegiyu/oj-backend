import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('public route validation', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 400 for invalid query on GET /public/music', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/public/music?page=not-a-number',
    });

    expect(response.statusCode).toBe(400);

    const body = response.json() as { success?: boolean; message?: string; error?: string };

    expect(body.success ?? false).toBe(false);
    expect(String(body.message ?? body.error ?? '')).toBeTruthy();
  });
});
