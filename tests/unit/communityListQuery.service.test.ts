import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/repositories/community/devotional.repository', () => ({
  listPublishedDevotionals: vi.fn(),
}));

vi.mock('../../src/repositories/community/poll.repository', () => ({
  listPolls: vi.fn(),
}));

vi.mock('../../src/repositories/community/resource.repository', () => ({
  findPublishedResourceByIdOrSlug: vi.fn(),
}));

import * as devotionalRepo from '../../src/repositories/community/devotional.repository';
import * as pollRepo from '../../src/repositories/community/poll.repository';
import * as resourceRepo from '../../src/repositories/community/resource.repository';
import { listDevotionals, listPolls, getResourceByIdOrSlug } from '../../src/services/community.service';
import type { FastifyRequest } from 'fastify';
import { AppError } from '../../src/utils/AppError';

describe('community.service list query behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(devotionalRepo.listPublishedDevotionals).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(pollRepo.listPolls).mockResolvedValue({ items: [], total: 0 });
  });

  it('treats devotional type=latest as sort only, not a Mongo type filter', async () => {
    await listDevotionals({
      query: { type: 'latest', limit: '12', page: '1' },
    } as FastifyRequest<{ Querystring: { type?: string; page?: string; limit?: string } }>);

    const call = vi.mocked(devotionalRepo.listPublishedDevotionals).mock.calls[0]?.[0];
    expect(call?.filter).not.toMatchObject({ type: 'latest' });
    expect(call?.sort).toEqual({ createdAt: -1 });
  });

  it('maps poll status=all to active and closed statuses', async () => {
    await listPolls({
      query: { status: 'all', limit: '12', page: '1' },
    } as FastifyRequest<{ Querystring: { status?: string; page?: string; limit?: string } }>);

    const call = vi.mocked(pollRepo.listPolls).mock.calls[0]?.[0];
    expect(call?.filter).toEqual({ status: { $in: ['active', 'closed'] } });
  });

  it('returns 404 when published resource is missing or incomplete', async () => {
    vi.mocked(resourceRepo.findPublishedResourceByIdOrSlug).mockResolvedValue(null);

    await expect(
      getResourceByIdOrSlug({
        params: { idOrSlug: 'missing-resource' },
      } as FastifyRequest<{ Params: { idOrSlug: string } }>)
    ).rejects.toBeInstanceOf(AppError);
  });
});
