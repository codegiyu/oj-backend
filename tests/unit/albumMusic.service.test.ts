import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/utils/AppError';

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
} from '../../src/services/albumMusic.service';

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
    const id = '507f1f77bcf86cd799439011';
    const result = parseAlbumAssignmentInput(id);

    expect(result.action).toBe('set');
    if (result.action === 'set') {
      expect(result.albumId.toString()).toBe(id);
    }
  });

  it('resolveAlbumForMusicAssignment rejects missing albums', async () => {
    albumFindById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    } as never);

    await expect(
      resolveAlbumForMusicAssignment({
        albumId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      })
    ).rejects.toMatchObject({ statusCode: 404 } satisfies Partial<AppError>);
  });

  it('resolveAlbumForMusicAssignment rejects artist mismatch', async () => {
    const albumArtist = new mongoose.Types.ObjectId('507f1f77bcf86cd799439012');
    const musicArtist = new mongoose.Types.ObjectId('507f1f77bcf86cd799439013');

    albumFindById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439011', artist: albumArtist }),
      }),
    } as never);

    await expect(
      resolveAlbumForMusicAssignment({
        albumId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        musicArtistId: musicArtist,
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('resolveAlbumForMusicAssignment accepts matching artists', async () => {
    const artistId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439012');
    const albumId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');

    albumFindById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: albumId, artist: artistId }),
      }),
    } as never);

    const result = await resolveAlbumForMusicAssignment({
      albumId,
      musicArtistId: artistId,
    });

    expect(result.toString()).toBe(albumId.toString());
  });

  it('clearMusicAlbumReferences unsets album on related music rows', async () => {
    const albumId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
    musicUpdateMany.mockResolvedValue({ modifiedCount: 2 } as never);

    await clearMusicAlbumReferences(albumId);

    expect(musicUpdateMany).toHaveBeenCalledWith({ album: albumId }, { $set: { album: null } });
  });
});
