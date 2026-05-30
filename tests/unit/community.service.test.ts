import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/repositories/community/devotional.repository', () => ({
  countPublishedDevotionals: vi.fn(),
  findTrendingDevotionals: vi.fn(),
}));

vi.mock('../../src/repositories/community/testimony.repository', () => ({
  countPublishedTestimonies: vi.fn(),
  findFeaturedTestimonies: vi.fn(),
}));

vi.mock('../../src/repositories/community/prayerRequest.repository', () => ({
  countPrayerRequests: vi.fn(),
  findRecentActivePrayerRequests: vi.fn(),
  findPrayerRequestByIdOrSlug: vi.fn(),
  findPrayerSolidarity: vi.fn(),
  createPrayerSolidarity: vi.fn(),
  incrementPrayerCount: vi.fn(),
}));

vi.mock('../../src/repositories/community/askPastor.repository', () => ({
  countAskPastorQuestions: vi.fn(),
}));

vi.mock('../../src/repositories/community/poll.repository', () => ({
  countPolls: vi.fn(),
}));

vi.mock('../../src/repositories/community/resource.repository', () => ({
  countPublishedResources: vi.fn(),
}));

vi.mock('../../src/repositories/community/artist.repository', () => ({
  countActiveCommunityArtists: vi.fn(),
}));

import * as devotionalRepo from '../../src/repositories/community/devotional.repository';
import * as testimonyRepo from '../../src/repositories/community/testimony.repository';
import * as prayerRequestRepo from '../../src/repositories/community/prayerRequest.repository';
import * as askPastorRepo from '../../src/repositories/community/askPastor.repository';
import * as pollRepo from '../../src/repositories/community/poll.repository';
import * as resourceRepo from '../../src/repositories/community/resource.repository';
import * as communityArtistRepo from '../../src/repositories/community/artist.repository';
import { getCommunity, sendPrayerForRequest } from '../../src/services/community.service';
import type { FastifyRequest } from 'fastify';

describe('community.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(devotionalRepo.countPublishedDevotionals).mockResolvedValue(3);
    vi.mocked(devotionalRepo.findTrendingDevotionals).mockResolvedValue([]);
    vi.mocked(testimonyRepo.countPublishedTestimonies).mockResolvedValue(2);
    vi.mocked(testimonyRepo.findFeaturedTestimonies).mockResolvedValue([]);
    vi.mocked(prayerRequestRepo.countPrayerRequests).mockResolvedValue(1);
    vi.mocked(prayerRequestRepo.findRecentActivePrayerRequests).mockResolvedValue([]);
    vi.mocked(askPastorRepo.countAskPastorQuestions).mockResolvedValue(4);
    vi.mocked(pollRepo.countPolls).mockResolvedValue(0);
    vi.mocked(resourceRepo.countPublishedResources).mockResolvedValue(0);
    vi.mocked(communityArtistRepo.countActiveCommunityArtists).mockResolvedValue(5);
  });

  it('returns community summary counts with artists and recent prayer requests', async () => {
    const result = await getCommunity();

    expect(result.statusCode).toBe(200);
    expect(result.data).toMatchObject({
      categoryCounts: {
        devotionals: 3,
        testimonies: 2,
        prayerRequests: 1,
        askAPastor: 4,
        polls: 0,
        resources: 0,
        artists: 5,
      },
      recentPrayerRequests: [],
    });
  });

  describe('sendPrayerForRequest', () => {
    const request = {
      params: { idOrSlug: 'abc123' },
      cookies: {},
      headers: {},
      ip: '127.0.0.1',
    } as unknown as FastifyRequest<{ Params: { idOrSlug: string } }>;

    it('increments prayers when not yet sent', async () => {
      vi.mocked(prayerRequestRepo.findPrayerRequestByIdOrSlug).mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        status: 'active',
        prayers: 2,
      });
      vi.mocked(prayerRequestRepo.findPrayerSolidarity).mockResolvedValue(null);
      vi.mocked(prayerRequestRepo.incrementPrayerCount).mockResolvedValue(3);

      const result = await sendPrayerForRequest(request);

      expect(result.statusCode).toBe(200);
      expect(result.data).toEqual({ prayers: 3 });
      expect(prayerRequestRepo.createPrayerSolidarity).toHaveBeenCalledOnce();
    });

    it('returns 409 when prayer already sent', async () => {
      vi.mocked(prayerRequestRepo.findPrayerRequestByIdOrSlug).mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        status: 'active',
        prayers: 2,
      });
      vi.mocked(prayerRequestRepo.findPrayerSolidarity).mockResolvedValue({ _id: 'existing' });

      await expect(sendPrayerForRequest(request)).rejects.toMatchObject({
        message: 'Already sent a prayer for this request',
        statusCode: 409,
      });
    });

    it('returns 404 when prayer request not found', async () => {
      vi.mocked(prayerRequestRepo.findPrayerRequestByIdOrSlug).mockResolvedValue(null);

      await expect(sendPrayerForRequest(request)).rejects.toMatchObject({
        message: 'Prayer request not found',
        statusCode: 404,
      });
    });
  });
});
