import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/repositories/contentCategory.repository', () => ({
  listActiveContentCategories: vi.fn(),
}));

vi.mock('../../src/repositories/homeAdvert.repository', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/repositories/homeAdvert.repository')>();
  return {
    ...actual,
    listActiveHomeAdverts: vi.fn(),
  };
});

import { listActiveContentCategories } from '../../src/repositories/contentCategory.repository';
import { listActiveHomeAdverts } from '../../src/repositories/homeAdvert.repository';
import {
  listPublicContentCategoriesForApi,
  listPublicHomeAdvertsForApi,
} from '../../src/services/publicCatalog.service';

describe('publicCatalog.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps content categories from the repository', async () => {
    vi.mocked(listActiveContentCategories).mockResolvedValue([
      {
        _id: 'cat1',
        name: 'Gospel',
        slug: 'gospel',
        scope: 'music',
        isActive: true,
      },
    ] as never);

    const result = await listPublicContentCategoriesForApi({
      scope: 'music',
      page: '1',
      limit: '10',
    });

    expect(listActiveContentCategories).toHaveBeenCalledWith({
      scope: 'music',
      limit: 10,
      skip: 0,
    });
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0]?.slug).toBe('gospel');
  });

  it('maps home adverts from the repository with a bounded limit', async () => {
    const createdAt = new Date('2026-01-15T12:00:00.000Z');
    vi.mocked(listActiveHomeAdverts).mockResolvedValue([
      {
        _id: new mongoose.Types.ObjectId(),
        slot: 'after_hero',
        imageUrl: 'https://cdn.example/ad.jpg',
        linkUrl: 'https://example.com',
        displayOrder: 1,
        createdAt,
      },
    ]);

    const result = await listPublicHomeAdvertsForApi({ limit: '5' });

    expect(listActiveHomeAdverts).toHaveBeenCalledWith(5);
    expect(result.adverts[0]?.slot).toBe('after_hero');
    expect(result.adverts[0]?.createdAt).toBe('2026-01-15T12:00:00.000Z');
  });
});
