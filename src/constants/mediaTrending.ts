const DAY_MS = 24 * 60 * 60 * 1000;

/** Rolling window for trending sections (music, video, news). */
export const TRENDING_ROLLING_WINDOW_MS = 7 * DAY_MS;

export interface TrendingWindow {
  windowStart: Date;
  windowEnd: Date;
}

export function resolveTrendingWindow(now: Date = new Date()): TrendingWindow {
  return {
    windowStart: new Date(now.getTime() - TRENDING_ROLLING_WINDOW_MS),
    windowEnd: now,
  };
}
