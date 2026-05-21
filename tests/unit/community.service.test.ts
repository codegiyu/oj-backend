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

import * as devotionalRepo from '../../src/repositories/community/devotional.repository';
import * as testimonyRepo from '../../src/repositories/community/testimony.repository';
import * as prayerRequestRepo from '../../src/repositories/community/prayerRequest.repository';
import * as askPastorRepo from '../../src/repositories/community/askPastor.repository';
import * as pollRepo from '../../src/repositories/community/poll.repository';
import * as resourceRepo from '../../src/repositories/community/resource.repository';
import { getCommunity } from '../../src/services/community.service';

describe('community.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(devotionalRepo.countPublishedDevotionals).mockResolvedValue(3);
    vi.mocked(devotionalRepo.findTrendingDevotionals).mockResolvedValue([]);
    vi.mocked(testimonyRepo.countPublishedTestimonies).mockResolvedValue(2);
    vi.mocked(testimonyRepo.findFeaturedTestimonies).mockResolvedValue([]);
    vi.mocked(prayerRequestRepo.countPrayerRequests).mockResolvedValue(1);
    vi.mocked(askPastorRepo.countAskPastorQuestions).mockResolvedValue(4);
    vi.mocked(pollRepo.countPolls).mockResolvedValue(0);
    vi.mocked(resourceRepo.countPublishedResources).mockResolvedValue(0);
  });

  it('returns community summary counts', async () => {
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
      },
    });
  });
});
