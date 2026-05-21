import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('API response envelope (integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns standard error envelope for invalid public music query', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/music?page=not-a-number',
    });

    expect(response.statusCode).toBe(400);

    const body: unknown = response.json();

    expect(body).toMatchObject({ success: false, responseCode: 400 });

    const record =
      body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {};

    expect(typeof record.message === 'string' && record.message.length > 0).toBe(true);
    expect(Array.isArray((record.data as { details?: unknown[] } | null)?.details)).toBe(true);
  });
});
