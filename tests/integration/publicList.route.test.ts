import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';

vi.mock('../../src/repositories/community/devotional.repository', () => ({
  listPublishedDevotionals: vi.fn(async () => ({ items: [], total: 0 })),
  countPublishedDevotionals: vi.fn(async () => 0),
  findTrendingDevotionals: vi.fn(async () => []),
  findPublishedDevotionalByIdOrSlug: vi.fn(async () => null),
  findDevotionalByIdPopulated: vi.fn(async () => null),
  findRelatedDevotionals: vi.fn(async () => []),
}));

vi.mock('../../src/repositories/community/poll.repository', () => ({
  listPolls: vi.fn(async () => ({ items: [], total: 0 })),
  countPolls: vi.fn(async () => 0),
  findPollByIdOrSlug: vi.fn(async () => null),
}));

vi.mock('../../src/repositories/community/resource.repository', () => ({
  findPublishedResourceByIdOrSlug: vi.fn(async () => null),
  countPublishedResources: vi.fn(async () => 0),
  countPublishedResourcesByType: vi.fn(async () => ({
    all: 0,
    byType: { ebook: 0, template: 0, beat: 0, wallpaper: 0, affiliate: 0 },
  })),
  listPublishedResources: vi.fn(async () => ({ items: [], total: 0 })),
}));

import * as devotionalRepo from '../../src/repositories/community/devotional.repository';
import * as pollRepo from '../../src/repositories/community/poll.repository';
import * as resourceRepo from '../../src/repositories/community/resource.repository';

describe('public list browse routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 400 for invalid sort on GET /public/devotionals', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${API_V1_PREFIX}/public/devotionals?sort=invalid`,
    });

    expect(response.statusCode).toBe(400);
  });

  it('accepts status=all on GET /public/polls', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${API_V1_PREFIX}/public/polls?status=all`,
    });

    expect(response.statusCode).toBe(200);
    expect(pollRepo.listPolls).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { status: { $in: ['active', 'closed'] } },
      })
    );
  });

  it('does not filter devotionals by type when type=popular', async () => {
    vi.mocked(devotionalRepo.listPublishedDevotionals).mockClear();

    const response = await app.inject({
      method: 'GET',
      url: `${API_V1_PREFIX}/public/devotionals?type=popular`,
    });

    expect(response.statusCode).toBe(200);

    const call = vi.mocked(devotionalRepo.listPublishedDevotionals).mock.calls.at(-1)?.[0];
    expect(call?.filter).not.toMatchObject({ type: 'popular' });
    expect(call?.sort).toEqual({ views: -1, createdAt: -1 });
  });

  it('returns 404 for missing resource detail', async () => {
    vi.mocked(resourceRepo.findPublishedResourceByIdOrSlug).mockResolvedValueOnce(null);

    const response = await app.inject({
      method: 'GET',
      url: `${API_V1_PREFIX}/public/resources/missing-resource`,
    });

    expect(response.statusCode).toBe(404);

    const body = response.json() as { success?: boolean; message?: string };
    expect(body.success).toBe(false);
    expect(body.message).toContain('Resource not found');
  });
});
