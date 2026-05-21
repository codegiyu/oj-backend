import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/models', () => ({
  Devotional: { countDocuments: vi.fn(), find: vi.fn() },
  Testimony: { countDocuments: vi.fn(), find: vi.fn() },
  PrayerRequest: { countDocuments: vi.fn() },
  AskPastorQuestion: { countDocuments: vi.fn() },
  Pastor: { countDocuments: vi.fn() },
  Poll: { countDocuments: vi.fn() },
  Resource: { countDocuments: vi.fn() },
}));

import { Devotional, Testimony } from '../../src/models';
import { getCommunity } from '../../src/services/community.service';

describe('community.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Devotional).countDocuments.mockResolvedValue(3);
    vi.mocked(Testimony).countDocuments.mockResolvedValue(2);
    vi.mocked(Devotional).find.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as never);
    vi.mocked(Testimony).find.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    } as never);
  });

  it('returns community summary counts', async () => {
    const result = await getCommunity();

    expect(result.statusCode).toBe(200);
    expect(result.data).toMatchObject({
      categoryCounts: {
        devotionals: 3,
        testimonies: 2,
      },
    });
  });
});
