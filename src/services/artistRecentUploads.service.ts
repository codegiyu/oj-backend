import mongoose from 'mongoose';
import { Music } from '../models/music';
import { Video } from '../models/video';

export interface ArtistRecentUploadItem {
  kind: 'music' | 'video';
  _id: string;
  title: string;
  createdAt: string;
  status: string;
  views?: number;
  plays?: number;
}

export async function buildArtistRecentUploads(
  artistId: mongoose.Types.ObjectId,
  limit = 6
): Promise<ArtistRecentUploadItem[]> {
  const [musicDocs, videoDocs] = await Promise.all([
    Music.find({ artist: artistId })
      .select('title createdAt status views plays')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean<
        Array<{
          _id: mongoose.Types.ObjectId;
          title: string;
          createdAt: Date;
          status: string;
          views?: number;
          plays?: number;
        }>
      >(),
    Video.find({ artist: artistId })
      .select('title createdAt status views')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean<
        Array<{
          _id: mongoose.Types.ObjectId;
          title: string;
          createdAt: Date;
          status: string;
          views?: number;
        }>
      >(),
  ]);

  const rows: ArtistRecentUploadItem[] = [
    ...musicDocs.map(m => ({
      kind: 'music' as const,
      _id: String(m._id),
      title: m.title,
      createdAt: m.createdAt.toISOString(),
      status: m.status,
      views: m.views,
      plays: m.plays,
    })),
    ...videoDocs.map(v => ({
      kind: 'video' as const,
      _id: String(v._id),
      title: v.title,
      createdAt: v.createdAt.toISOString(),
      status: v.status,
      views: v.views,
    })),
  ];

  return rows
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
