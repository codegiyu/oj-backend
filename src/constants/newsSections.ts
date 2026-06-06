import { TRENDING_ROLLING_WINDOW_MS } from './mediaTrending';

/** Minimum priority (1–5) for breaking-news section eligibility. */
export const BREAKING_NEWS_MIN_PRIORITY = 4;

/** Max age (ms) for breaking-news section — articles older than this drop out. */
export const BREAKING_NEWS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Rolling window for trending news (re-exported for news-specific callers). */
export const TRENDING_NEWS_WINDOW_MS = TRENDING_ROLLING_WINDOW_MS;

export function buildBreakingNewsSectionFilter(now: Date = new Date()): Record<string, unknown> {
  const cutoff = new Date(now.getTime() - BREAKING_NEWS_MAX_AGE_MS);

  return {
    priority: { $gte: BREAKING_NEWS_MIN_PRIORITY },
    createdAt: { $gte: cutoff },
  };
}

/** Base eligibility for trending news; period views ranking is applied in mediaTrending.service. */
export function buildTrendingNewsSectionFilter(): Record<string, unknown> {
  return {};
}
