import { describe, expect, it } from 'vitest';
import { resolveTrendingWindow, TRENDING_ROLLING_WINDOW_MS } from '../../src/constants/mediaTrending';
import {
  buildBreakingNewsSectionFilter,
  buildTrendingNewsSectionFilter,
  TRENDING_NEWS_WINDOW_MS,
} from '../../src/constants/newsSections';

describe('mediaTrending', () => {
  it('resolveTrendingWindow uses a 7-day rolling window', () => {
    const now = new Date('2026-06-06T12:00:00.000Z');
    const { windowStart, windowEnd } = resolveTrendingWindow(now);

    expect(windowEnd).toEqual(now);
    expect(windowEnd.getTime() - windowStart.getTime()).toBe(TRENDING_ROLLING_WINDOW_MS);
  });
});

describe('newsSections trending', () => {
  it('re-exports trending window constant', () => {
    expect(TRENDING_NEWS_WINDOW_MS).toBe(TRENDING_ROLLING_WINDOW_MS);
  });

  it('buildTrendingNewsSectionFilter returns empty base filter', () => {
    expect(buildTrendingNewsSectionFilter()).toEqual({});
  });

  it('buildBreakingNewsSectionFilter keeps priority and recency constraints', () => {
    const now = new Date('2026-06-06T12:00:00.000Z');
    const filter = buildBreakingNewsSectionFilter(now);

    expect(filter.priority).toEqual({ $gte: 4 });
    expect(filter.createdAt).toEqual({ $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) });
  });
});
