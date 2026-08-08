import { paginateTrendingWithRecentBackfill } from '../../../src/services/mediaTrending.service';

describe('phase3 trending recent backfill', () => {
  it('backfills sparse trending page 1 with newest remaining videos', () => {
    const { pageRows } = paginateTrendingWithRecentBackfill({
      scored: [{ doc: { _id: 'hot', createdAt: '2026-01-01' }, periodViews: 3 }],
      allDocs: [
        { _id: 'hot', createdAt: '2026-01-01' },
        { _id: 'new', createdAt: '2026-07-01' },
        { _id: 'older', createdAt: '2026-06-01' },
      ],
      page: 1,
      limit: 3,
    });

    expect(pageRows.map(row => String(row.doc._id))).toEqual(['hot', 'new', 'older']);
  });
});
