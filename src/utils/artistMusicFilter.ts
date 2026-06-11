import mongoose from 'mongoose';
import { Album } from '../models/album';
import { mergePublicFilter, publishedMusicCompletenessFilter } from './contentCompleteness';

export async function fetchPublishedAlbumIdsForArtist(
  artistId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId[]> {
  return Album.find({ artist: artistId, status: 'published' }).distinct('_id');
}

export async function fetchPublishedAlbumIdsForArtists(
  artistIds: mongoose.Types.ObjectId[]
): Promise<mongoose.Types.ObjectId[]> {
  if (artistIds.length === 0) return [];

  return Album.find({ artist: { $in: artistIds }, status: 'published' }).distinct('_id');
}

/** Direct artist link or published album owned by the artist. */
export function buildArtistMusicScopeClause(
  artistId: mongoose.Types.ObjectId,
  albumIds: mongoose.Types.ObjectId[]
): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [{ artist: artistId }];

  if (albumIds.length > 0) {
    clauses.push({ album: { $in: albumIds } });
  }

  return { $or: clauses };
}

export function buildArtistMusicScopeClauseForMany(
  artistIds: mongoose.Types.ObjectId[],
  albumIds: mongoose.Types.ObjectId[]
): Record<string, unknown> {
  const clauses: Record<string, unknown>[] = [{ artist: { $in: artistIds } }];

  if (albumIds.length > 0) {
    clauses.push({ album: { $in: albumIds } });
  }

  return { $or: clauses };
}

export async function applyArtistMusicScopeToFilter(
  filter: Record<string, unknown>,
  artistId: mongoose.Types.ObjectId
): Promise<Record<string, unknown>> {
  const albumIds = await fetchPublishedAlbumIdsForArtist(artistId);

  return {
    ...filter,
    ...buildArtistMusicScopeClause(artistId, albumIds),
  };
}

export async function buildPublishedMusicFilterForArtists(
  artistIds: mongoose.Types.ObjectId[],
  base: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const albumIds = await fetchPublishedAlbumIdsForArtists(artistIds);

  return mergePublicFilter(
    {
      ...base,
      ...buildArtistMusicScopeClauseForMany(artistIds, albumIds),
    },
    publishedMusicCompletenessFilter()
  );
}
