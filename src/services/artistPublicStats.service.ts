import mongoose from 'mongoose';
import { Music } from '../models/music';
import { Video } from '../models/video';
import {
  mergePublicFilter,
  publishedMusicCompletenessFilter,
  publishedVideoCompletenessFilter,
} from '../utils/contentCompleteness';
import { leanIdToString } from '../utils/leanId';

export interface ArtistPublishedContentCounts {
  songs: number;
  videos: number;
}

function emptyCountsMap(): Map<string, ArtistPublishedContentCounts> {
  return new Map();
}

function publishedMusicFilter(artistIds: mongoose.Types.ObjectId[]): Record<string, unknown> {
  return mergePublicFilter(
    { status: 'published', artist: { $in: artistIds } },
    publishedMusicCompletenessFilter()
  );
}

function publishedVideoFilter(artistIds: mongoose.Types.ObjectId[]): Record<string, unknown> {
  return mergePublicFilter(
    { status: 'published', artist: { $in: artistIds } },
    publishedVideoCompletenessFilter()
  );
}

export async function getPublishedContentCountsByArtistIds(
  artistIds: mongoose.Types.ObjectId[]
): Promise<Map<string, ArtistPublishedContentCounts>> {
  const counts = emptyCountsMap();
  if (artistIds.length === 0) return counts;

  const [songRows, videoRows] = await Promise.all([
    Music.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: publishedMusicFilter(artistIds) },
      { $group: { _id: '$artist', count: { $sum: 1 } } },
    ]),
    Video.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: publishedVideoFilter(artistIds) },
      { $group: { _id: '$artist', count: { $sum: 1 } } },
    ]),
  ]);

  for (const artistId of artistIds) {
    counts.set(leanIdToString(artistId), { songs: 0, videos: 0 });
  }

  for (const row of songRows) {
    const key = leanIdToString(row._id);
    const current = counts.get(key) ?? { songs: 0, videos: 0 };
    counts.set(key, { ...current, songs: row.count });
  }

  for (const row of videoRows) {
    const key = leanIdToString(row._id);
    const current = counts.get(key) ?? { songs: 0, videos: 0 };
    counts.set(key, { ...current, videos: row.count });
  }

  return counts;
}
