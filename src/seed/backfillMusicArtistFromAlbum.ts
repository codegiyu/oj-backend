import mongoose from 'mongoose';
import { Album } from '../models/album';
import { Music } from '../models/music';
import { logger } from '../utils/logger';

export type BackfillMusicArtistFromAlbumStats = {
  candidates: number;
  updated: number;
  skippedNoAlbumArtist: number;
  skippedAlreadySet: number;
};

type AlbumArtistLean = {
  artist?: mongoose.Types.ObjectId | null;
};

/**
 * Idempotent backfill: set music.artist from album.artist when the track has an album
 * but no direct artist link. Safe to run on every `npm run seed`.
 */
export async function backfillMusicArtistFromAlbum(): Promise<BackfillMusicArtistFromAlbumStats> {
  const stats: BackfillMusicArtistFromAlbumStats = {
    candidates: 0,
    updated: 0,
    skippedNoAlbumArtist: 0,
    skippedAlreadySet: 0,
  };

  const cursor = Music.find({ artist: null, album: { $ne: null } })
    .select('_id album')
    .lean()
    .cursor();

  for await (const track of cursor) {
    stats.candidates += 1;

    if (track._id == null || track.album == null) {
      stats.skippedNoAlbumArtist += 1;
      continue;
    }

    const album = await Album.findById(track.album).select('artist').lean<AlbumArtistLean>();

    if (!album?.artist) {
      stats.skippedNoAlbumArtist += 1;
      continue;
    }

    const result = await Music.updateOne(
      { _id: track._id, artist: null },
      { $set: { artist: album.artist } }
    );

    if (result.modifiedCount > 0) {
      stats.updated += 1;
    } else {
      stats.skippedAlreadySet += 1;
    }
  }

  logger.info('backfillMusicArtistFromAlbum: completed', stats);

  return stats;
}
