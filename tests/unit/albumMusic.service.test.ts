import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/utils/AppError';
import {
  MOCK_ALBUM_IDS,
  MOCK_ARTIST_IDS,
  mockAlbumAssignmentLean,
  mockAlbumSummary,
  toObjectId,
} from '../helpers/albumMusicFixtures';

const { albumFindById, musicUpdateMany } = vi.hoisted(() => ({
  albumFindById: vi.fn(),
  musicUpdateMany: vi.fn(),
}));

vi.mock('../../src/models/album', () => ({
  Album: {
    findById: albumFindById,
  },
}));

vi.mock('../../src/models/music', () => ({
  Music: {
    updateMany: musicUpdateMany,
  },
}));

import {
  parseAlbumAssignmentInput,
  resolveAlbumForMusicAssignment,
  clearMusicAlbumReferences,
  resolveMusicArtistFromAlbum,
} from '../../src/services/albumMusic.service';

function mockAlbumFindByIdLean(album: Record<string, unknown> | null) {
  albumFindById.mockReturnValue({
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(album),
    }),
  } as never);
}

describe('albumMusic.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parseAlbumAssignmentInput skips when albumId is undefined', () => {
    expect(parseAlbumAssignmentInput(undefined)).toEqual({ action: 'skip' });
  });

  it('parseAlbumAssignmentInput clears when albumId is empty', () => {
    expect(parseAlbumAssignmentInput('')).toEqual({ action: 'clear' });
    expect(parseAlbumAssignmentInput(null)).toEqual({ action: 'clear' });
  });

  it('parseAlbumAssignmentInput sets when albumId is a valid object id', () => {
    const result = parseAlbumAssignmentInput(MOCK_ALBUM_IDS.primary);

    expect(result.action).toBe('set');
    if (result.action === 'set') {
      expect(result.albumId.toString()).toBe(MOCK_ALBUM_IDS.primary);
    }
  });

  it('resolveAlbumForMusicAssignment rejects missing albums', async () => {
    mockAlbumFindByIdLean(null);

    await expect(
      resolveAlbumForMusicAssignment({
        albumId: toObjectId(MOCK_ALBUM_IDS.primary),
      })
    ).rejects.toMatchObject({ statusCode: 404 } satisfies Partial<AppError>);
  });

  it('resolveAlbumForMusicAssignment rejects artist mismatch', async () => {
    mockAlbumFindByIdLean(
      mockAlbumAssignmentLean({
        artistId: MOCK_ARTIST_IDS.primary,
      })
    );

    await expect(
      resolveAlbumForMusicAssignment({
        albumId: toObjectId(MOCK_ALBUM_IDS.primary),
        musicArtistId: toObjectId(MOCK_ARTIST_IDS.alternate),
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('resolveAlbumForMusicAssignment accepts matching artists', async () => {
    const albumId = toObjectId(MOCK_ALBUM_IDS.primary);
    const artistId = toObjectId(MOCK_ARTIST_IDS.primary);
    const albumLean = mockAlbumAssignmentLean({
      albumId: MOCK_ALBUM_IDS.primary,
      artistId,
    });

    mockAlbumFindByIdLean(albumLean);

    const result = await resolveAlbumForMusicAssignment({
      albumId,
      musicArtistId: artistId,
    });

    expect(result.toString()).toBe(albumId.toString());
    expect(albumLean).toMatchObject({
      title: mockAlbumSummary.title,
      slug: mockAlbumSummary.slug,
      artist: artistId,
    });
  });

  it('resolveMusicArtistFromAlbum returns album owner when present', async () => {
    const artistId = toObjectId(MOCK_ARTIST_IDS.primary);
    mockAlbumFindByIdLean(mockAlbumAssignmentLean({ artistId }));

    const result = await resolveMusicArtistFromAlbum(toObjectId(MOCK_ALBUM_IDS.primary));

    expect(result?.toString()).toBe(artistId.toString());
  });

  it('resolveMusicArtistFromAlbum returns null when album is missing', async () => {
    mockAlbumFindByIdLean(null);

    const result = await resolveMusicArtistFromAlbum(toObjectId(MOCK_ALBUM_IDS.primary));

    expect(result).toBeNull();
  });

  it('clearMusicAlbumReferences unsets album on related music rows', async () => {
    const albumId = toObjectId(MOCK_ALBUM_IDS.primary);
    musicUpdateMany.mockResolvedValue({ modifiedCount: 2 } as never);

    await clearMusicAlbumReferences(albumId);

    expect(musicUpdateMany).toHaveBeenCalledWith({ album: albumId }, { $set: { album: null } });
  });
});
