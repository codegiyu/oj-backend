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

    const { pageRows, total } = paginateTrendingWithRecentBackfill({
      scored,
      allDocs,
      page: 1,
      limit: 2,
    });

    expect(pageRows.map(row => String(row.doc._id))).toEqual(['a', 'b']);
    expect(total).toBe(3);
  });

  it('continues recent remainder on page 2 with stable total', () => {
    const scored = [{ doc: { _id: 'hot', createdAt: '2026-01-01' }, periodViews: 9 }];
    const allDocs = [
      { _id: 'hot', createdAt: '2026-01-01' },
      { _id: 'new', createdAt: '2026-07-01' },
      { _id: 'older', createdAt: '2026-06-01' },
    ];

    const page1 = paginateTrendingWithRecentBackfill({
      scored,
      allDocs,
      page: 1,
      limit: 2,
    });
    const page2 = paginateTrendingWithRecentBackfill({
      scored,
      allDocs,
      page: 2,
      limit: 2,
    });

    expect(page1.pageRows.map(row => String(row.doc._id))).toEqual(['hot', 'new']);
    expect(page2.pageRows.map(row => String(row.doc._id))).toEqual(['older']);
    expect(page1.total).toBe(3);
    expect(page2.total).toBe(3);
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
