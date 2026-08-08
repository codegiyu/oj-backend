import { resolveTrendingWindow, TRENDING_ROLLING_WINDOW_MS } from '../../src/constants/mediaTrending';
import {
  buildBreakingNewsSectionFilter,
  buildTrendingNewsSectionFilter,
  TRENDING_NEWS_WINDOW_MS,
} from '../../src/constants/newsSections';
import { paginateTrendingWithRecentBackfill } from '../../src/services/mediaTrending.service';

describe('mediaTrending', () => {
  it('resolveTrendingWindow uses a 7-day rolling window', () => {
    const now = new Date('2026-06-06T12:00:00.000Z');
    const { windowStart, windowEnd } = resolveTrendingWindow(now);

    expect(windowEnd).toEqual(now);
    expect(windowEnd.getTime() - windowStart.getTime()).toBe(TRENDING_ROLLING_WINDOW_MS);
  });
});

describe('paginateTrendingWithRecentBackfill', () => {
  it('keeps period-view winners first and fills remaining slots with recent docs', () => {
    const scored = [
      { doc: { _id: 'a', createdAt: '2026-01-01' }, periodViews: 10 },
      { doc: { _id: 'b', createdAt: '2026-01-02' }, periodViews: 5 },
    ];
    const allDocs = [
      { _id: 'a', createdAt: '2026-01-01' },
      { _id: 'b', createdAt: '2026-01-02' },
      { _id: 'c', createdAt: '2026-06-01' },
      { _id: 'd', createdAt: '2026-05-01' },
    ];

    const { pageRows, total } = paginateTrendingWithRecentBackfill({
      scored,
      allDocs,
      page: 1,
      limit: 4,
    });

    expect(pageRows.map(row => String(row.doc._id))).toEqual(['a', 'b', 'c', 'd']);
    expect(pageRows[2]?.periodViews).toBe(0);
    expect(total).toBe(4);
  });

  it('does not backfill when trending already fills the page', () => {
    const scored = [
      { doc: { _id: 'a', createdAt: '2026-01-01' }, periodViews: 10 },
      { doc: { _id: 'b', createdAt: '2026-01-02' }, periodViews: 5 },
    ];
    const allDocs = [
      ...scored.map(row => row.doc),
      { _id: 'c', createdAt: '2026-06-01' },
    ];

    const { pageRows } = paginateTrendingWithRecentBackfill({
      scored,
      allDocs,
      page: 1,
      limit: 2,
    });

    expect(pageRows.map(row => String(row.doc._id))).toEqual(['a', 'b']);
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
