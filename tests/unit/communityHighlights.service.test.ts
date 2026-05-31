import { describe, expect, it } from 'vitest';
import { mergeCommunityHighlights } from '../../src/services/communityHighlights.service';

describe('mergeCommunityHighlights', () => {
  it('interleaves testimonies, devotionals, and prayer requests by timestamp', () => {
    const result = mergeCommunityHighlights({
      testimonies: [
        { _id: '1', title: 'T1', content: 'c', createdAt: '2024-01-03T00:00:00.000Z' },
      ],
      devotionals: [
        { _id: '2', title: 'D1', excerpt: 'e', createdAt: '2024-01-02T00:00:00.000Z' },
      ],
      prayerRequests: [
        { _id: '3', title: 'P1', content: 'p', createdAt: '2024-01-01T00:00:00.000Z' },
      ],
      limit: 3,
    });

    expect(result).toHaveLength(3);
    expect(result.map(item => item.kind)).toEqual(['testimony', 'devotional', 'prayer-request']);
  });

  it('respects limit', () => {
    const result = mergeCommunityHighlights({
      testimonies: Array.from({ length: 5 }, (_, i) => ({
        _id: String(i),
        title: `T${i}`,
        createdAt: `2024-01-0${i + 1}T00:00:00.000Z`,
      })),
      devotionals: [],
      prayerRequests: [],
      limit: 2,
    });

    expect(result).toHaveLength(2);
  });
});
