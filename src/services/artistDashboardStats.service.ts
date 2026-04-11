import mongoose from 'mongoose';
import { Music } from '../models/music';
import { Video } from '../models/video';
import { Devotional } from '../models/devotional';

export interface ContentMetricsBreakdown {
  views: number;
  plays: number;
  downloads: number;
}

export interface ArtistDashboardStatsPayload {
  tracksCount: number;
  videosCount: number;
  devotionalsCount: number;
  totalViews: number;
  totalPlays: number;
  totalDownloads: number;
  music: ContentMetricsBreakdown;
  video: ContentMetricsBreakdown;
  devotionals: { views: number; plays: number; downloads: number };
  topMusic?: Array<{ _id: string; title: string; plays?: number; views?: number }>;
  topVideos?: Array<{ _id: string; title: string; plays?: number; views?: number }>;
  tracksAddedThisMonth?: number;
  playsDeltaPercent?: number | null;
}

function sumField<T extends Record<string, unknown>>(rows: T[], key: keyof T): number {
  return rows[0]?.[key] != null ? Number(rows[0][key]) : 0;
}

export async function buildArtistDashboardStats(
  artistId: mongoose.Types.ObjectId,
  options?: { includeTopLists?: boolean }
): Promise<ArtistDashboardStatsPayload> {
  const includeTop = options?.includeTopLists ?? false;

  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [
    tracksCount,
    videosCount,
    devotionalsCount,
    musicAgg,
    videoAgg,
    devotionalAgg,
    tracksThisMonth,
    topMusicDocs,
    topVideoDocs,
  ] = await Promise.all([
    Music.countDocuments({ artist: artistId }),
    Video.countDocuments({ artist: artistId }),
    Devotional.countDocuments({ artist: artistId }),
    Music.aggregate<{ views: number; plays: number; downloads: number }>([
      { $match: { artist: artistId } },
      {
        $group: {
          _id: null,
          views: { $sum: { $ifNull: ['$views', 0] } },
          plays: { $sum: { $ifNull: ['$plays', 0] } },
          downloads: { $sum: { $ifNull: ['$downloads', 0] } },
        },
      },
    ]),
    Video.aggregate<{ views: number; plays: number; downloads: number }>([
      { $match: { artist: artistId } },
      {
        $group: {
          _id: null,
          views: { $sum: { $ifNull: ['$views', 0] } },
          plays: { $sum: { $ifNull: ['$plays', 0] } },
          downloads: { $sum: { $ifNull: ['$downloads', 0] } },
        },
      },
    ]),
    Devotional.aggregate<{ views: number; plays: number }>([
      { $match: { artist: artistId } },
      {
        $group: {
          _id: null,
          views: { $sum: { $ifNull: ['$views', 0] } },
          plays: { $sum: { $ifNull: ['$plays', 0] } },
        },
      },
    ]),
    Music.countDocuments({ artist: artistId, createdAt: { $gte: startOfMonth } }),
    includeTop
      ? Music.find({ artist: artistId })
          .sort({ plays: -1 })
          .limit(5)
          .select('title plays views')
          .lean()
      : Promise.resolve([]),
    includeTop
      ? Video.find({ artist: artistId })
          .sort({ views: -1 })
          .limit(5)
          .select('title views plays')
          .lean()
      : Promise.resolve([]),
  ]);

  const music: ContentMetricsBreakdown = {
    views: sumField(musicAgg, 'views'),
    plays: sumField(musicAgg, 'plays'),
    downloads: sumField(musicAgg, 'downloads'),
  };
  const video: ContentMetricsBreakdown = {
    views: sumField(videoAgg, 'views'),
    plays: sumField(videoAgg, 'plays'),
    downloads: sumField(videoAgg, 'downloads'),
  };
  const devotionalViews = sumField(devotionalAgg, 'views');
  const devotionalPlays = sumField(devotionalAgg, 'plays');
  const devotionals = {
    views: devotionalViews,
    plays: devotionalPlays,
    downloads: 0,
  };

  const totalViews = music.views + video.views + devotionals.views;
  const totalPlays = music.plays + video.plays + devotionals.plays;
  const totalDownloads = music.downloads + video.downloads + devotionals.downloads;

  const payload: ArtistDashboardStatsPayload = {
    tracksCount,
    videosCount,
    devotionalsCount,
    totalViews,
    totalPlays,
    totalDownloads,
    music,
    video,
    devotionals,
    tracksAddedThisMonth: tracksThisMonth,
    playsDeltaPercent: null,
  };

  if (includeTop) {
    payload.topMusic = (
      topMusicDocs as { _id: unknown; title?: string; plays?: number; views?: number }[]
    ).map(m => ({
      _id: String(m._id),
      title: m.title ?? '',
      plays: m.plays ?? 0,
      views: m.views ?? 0,
    }));
    payload.topVideos = (
      topVideoDocs as { _id: unknown; title?: string; plays?: number; views?: number }[]
    ).map(v => ({
      _id: String(v._id),
      title: v.title ?? '',
      plays: v.plays ?? 0,
      views: v.views ?? 0,
    }));
  }

  return payload;
}
