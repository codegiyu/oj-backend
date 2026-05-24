import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/utils/AppError';

vi.mock('../../src/repositories/public/album.repository', () => ({
  listPublishedAlbums: vi.fn(),
  findPublishedAlbumByIdOrSlug: vi.fn(),
  findPublishedAlbumByIdPopulated: vi.fn(),
}));

vi.mock('../../src/repositories/admin/album.repository', () => ({
  listMusicTracksForAlbum: vi.fn(),
}));

import * as albumRepo from '../../src/repositories/public/album.repository';
import { listMusicTracksForAlbum } from '../../src/repositories/admin/album.repository';
import { getPublicAlbumByIdOrSlug, listPublicAlbums } from '../../src/services/publicAlbum.service';

describe('publicAlbum.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists published albums with pagination', async () => {
    vi.mocked(albumRepo.listPublishedAlbums).mockResolvedValue({
      items: [
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Songs of Hope',
          slug: 'songs-of-hope',
          coverImage: '/cover.jpg',
          status: 'published',
          isFeatured: false,
          displayOrder: 0,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-02'),
        },
      ],
      total: 1,
    });

    const result = await listPublicAlbums({ query: {} } as never);

    expect(result.statusCode).toBe(200);
    expect((result.data as { albums: unknown[] }).albums).toHaveLength(1);
  });

  it('loads album detail with published tracks', async () => {
    vi.mocked(albumRepo.findPublishedAlbumByIdOrSlug).mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      title: 'Songs of Hope',
      slug: 'songs-of-hope',
      status: 'published',
      coverImage: '/cover.jpg',
      isFeatured: false,
      displayOrder: 0,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    });
    vi.mocked(albumRepo.findPublishedAlbumByIdPopulated).mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      title: 'Songs of Hope',
      slug: 'songs-of-hope',
      status: 'published',
      coverImage: '/cover.jpg',
      isFeatured: false,
      displayOrder: 0,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    });
    vi.mocked(listMusicTracksForAlbum).mockResolvedValue([
      {
        _id: '507f1f77bcf86cd799439012',
        title: 'Track One',
        slug: 'track-one',
        coverImage: '/track.jpg',
        displayOrder: 1,
      },
    ]);

    const result = await getPublicAlbumByIdOrSlug({
      params: { idOrSlug: 'songs-of-hope' },
    } as never);

    expect(result.statusCode).toBe(200);
    expect((result.data as { tracks: unknown[] }).tracks).toHaveLength(1);
  });

  it('returns 404 when album is not published', async () => {
    vi.mocked(albumRepo.findPublishedAlbumByIdOrSlug).mockResolvedValue(null);

    await expect(
      getPublicAlbumByIdOrSlug({ params: { idOrSlug: 'missing' } } as never)
    ).rejects.toMatchObject({ statusCode: 404 } satisfies Partial<AppError>);
  });
});
