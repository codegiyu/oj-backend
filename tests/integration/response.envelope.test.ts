import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

vi.mock('../../src/repositories/public/music.repository', () => ({
  listPublishedMusic: vi.fn(async () => ({
    items: [
      {
        _id: '507f1f77bcf86cd799439011',
        title: 'Test Track',
        slug: 'test-track',
        audioUrl: 'https://cdn.example/track.mp3',
        category: 'gospel',
        status: 'published',
        plays: 0,
        createdAt: new Date('2026-01-01'),
      },
    ],
    total: 1,
  })),
}));

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

  it('preserves music list payload keys on GET /public/music (withSuccessEnvelope serializer)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/music?limit=1&page=1&status=published',
    });

    expect(response.statusCode).toBe(200);

    const body: unknown = response.json();
    const record =
      body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {};

    expect(record).toMatchObject({ success: true, responseCode: 200 });

    const data =
      record.data !== null && typeof record.data === 'object'
        ? (record.data as Record<string, unknown>)
        : null;

    expect(data).not.toBeNull();
    expect(data).not.toEqual({});
    expect(Array.isArray(data?.music)).toBe(true);
    expect(data?.pagination).toMatchObject({
      page: expect.any(Number),
      limit: expect.any(Number),
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });
});
