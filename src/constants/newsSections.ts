/** Minimum priority (1–5) for breaking-news section eligibility. */
export const BREAKING_NEWS_MIN_PRIORITY = 4;

/** Max age (ms) for breaking-news section — articles older than this drop out. */
export const BREAKING_NEWS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function buildBreakingNewsSectionFilter(now: Date = new Date()): Record<string, unknown> {
  const cutoff = new Date(now.getTime() - BREAKING_NEWS_MAX_AGE_MS);

  return {
    priority: { $gte: BREAKING_NEWS_MIN_PRIORITY },
    createdAt: { $gte: cutoff },
  };
}
