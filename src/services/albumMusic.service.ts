import mongoose from 'mongoose';
import { Album } from '../models/album';
import { Music } from '../models/music';
import type { IAlbum } from '../lib/types/constants';
import { AppError } from '../utils/AppError';
import { parseObjectId } from '../controllers/admin/admin.helpers';

type AlbumArtistLean = Pick<IAlbum, '_id' | 'artist'>;

export type AlbumAssignmentResult =
  | { action: 'skip' }
  | { action: 'clear' }
  | { action: 'set'; albumId: mongoose.Types.ObjectId };

export function parseAlbumAssignmentInput(
  albumId: string | null | undefined
): AlbumAssignmentResult {
  if (albumId === undefined) {
    return { action: 'skip' };
  }

  const trimmed = albumId?.trim() ?? '';

  if (!trimmed) {
    return { action: 'clear' };
  }

  return { action: 'set', albumId: parseObjectId(trimmed, 'albumId') };
}

export async function resolveAlbumForMusicAssignment(input: {
  albumId: mongoose.Types.ObjectId;
  musicArtistId?: mongoose.Types.ObjectId | null;
}): Promise<mongoose.Types.ObjectId> {
  const album = await Album.findById(input.albumId).select('_id artist').lean<AlbumArtistLean>();

  if (!album) {
    throw new AppError('Album not found', 404);
  }

  const albumArtist = album.artist;

  if (input.musicArtistId && albumArtist && !albumArtist.equals(input.musicArtistId)) {
    throw new AppError('Album artist must match the track artist', 400);
  }

  return input.albumId;
}

export async function clearMusicAlbumReferences(albumId: mongoose.Types.ObjectId): Promise<void> {
  await Music.updateMany({ album: albumId }, { $set: { album: null } });
}
