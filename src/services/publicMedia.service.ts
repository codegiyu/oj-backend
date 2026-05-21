import type { FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import { Music } from '../models/music';
import { Video } from '../models/video';
import { NewsArticle } from '../models/newsArticle';
import { ARTIST_POPULATE_SELECT } from '../controllers/artist/artist.helpers';
import { parsePositiveInteger, parseString } from '../utils/helpers';
import { isLikelyYoutubeUrl } from '../utils/videoEmbed';
import { findByIdOrSlug } from '../repositories/community/shared';
import {
  shapeMusicListItem,
  shapeMusicDetail,
  shapeVideoListItem,
  shapeVideoDetail,
  shapeArticleListItem,
  shapeArticleDetail,
} from './publicMedia.shaping';
import {
  PUBLIC_LIST_DEFAULT_LIMIT as DEFAULT_LIMIT,
  PUBLIC_LIST_MAX_LIMIT as MAX_LIMIT,
} from '../constants/pagination';

export type PublicMediaServiceResult = {
  statusCode: number;
  data?: unknown;
  message: string;
  redirectUrl?: string;
};

/**
 * Public music, video, and news catalog logic.
 */

// ----- Music -----

export async function listPublicMusic(
  request: FastifyRequest<{
    Querystring: {
      category?: string;
      excludeCategory?: string;
      artist?: string;
      page?: string;
      limit?: string;
      status?: string;
      type?: string;
      period?: string;
    };
  }>
): Promise<PublicMediaServiceResult> {
  const limit = parsePositiveInteger(request.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const status = parseString(request.query.status);
  const category = parseString(request.query.category);
  const excludeCategory = parseString(request.query.excludeCategory);
  const artistId = parseString(request.query.artist);
  const type = parseString(request.query.type);

  const filter: Record<string, unknown> = {};
  if (status === 'published') filter.status = 'published';
  else filter.status = 'published'; // public: only published
  if (category && category !== 'all') filter.category = category;
  else if (excludeCategory && excludeCategory !== 'all') filter.category = { $ne: excludeCategory };
  if (artistId && mongoose.Types.ObjectId.isValid(artistId)) {
    filter.artist = new mongoose.Types.ObjectId(artistId);
  }

  let sort: Record<string, 1 | -1> = { createdAt: -1 };
  if (type === 'trending') sort = { plays: -1, createdAt: -1 };
  else if (type === 'featured') {
    filter.isFeatured = true;
    sort = { displayOrder: 1, createdAt: -1 };
  } else if (type === 'recent') sort = { createdAt: -1 };
  else if (type === 'charts') {
    sort = { plays: -1, createdAt: -1 };
    // period: weekly/monthly/alltime - we don't have time-range data, so use all
  }

  const [items, total] = await Promise.all([
    Music.find(filter)
      .sort(sort)
      .populate('artist', ARTIST_POPULATE_SELECT)
      .skip(skip)
      .limit(limit)
      .lean(),
    Music.countDocuments(filter),
  ]);

  const music = (items as unknown as Record<string, unknown>[]).map((doc, i) =>
    shapeMusicListItem(doc, i, type ?? '')
  );

  return {
    statusCode: 200,
    data: {
      music,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    message: 'Music list loaded.',
  };
}

export async function getPublicMusicByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<PublicMediaServiceResult> {
  const doc = await findByIdOrSlug(Music, request.params.idOrSlug, { status: 'published' });
  if (!doc) throw new AppError('Music not found', 404);
  const populated = await Music.findById(doc._id).populate('artist', ARTIST_POPULATE_SELECT).lean();
  if (!populated) throw new AppError('Music not found', 404);
  const music = shapeMusicDetail(populated as unknown as Record<string, unknown>);
  return { statusCode: 200, data: { music }, message: 'Music loaded.' };
}

// ----- Videos -----

export async function listPublicVideos(
  request: FastifyRequest<{
    Querystring: {
      category?: string;
      artist?: string;
      page?: string;
      limit?: string;
      status?: string;
      type?: string;
    };
  }>
): Promise<PublicMediaServiceResult> {
  const limit = parsePositiveInteger(request.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const status = parseString(request.query.status);
  const category = parseString(request.query.category);
  const artistId = parseString(request.query.artist);
  const type = parseString(request.query.type);

  const filter: Record<string, unknown> = {};
  if (status === 'published') filter.status = 'published';
  else filter.status = 'published';
  if (category && category !== 'all') filter.category = category;
  if (artistId && mongoose.Types.ObjectId.isValid(artistId)) {
    filter.artist = new mongoose.Types.ObjectId(artistId);
  }

  let sort: Record<string, 1 | -1> = { createdAt: -1 };
  if (type === 'trending') sort = { views: -1, createdAt: -1 };
  else if (type === 'featured') {
    filter.isFeatured = true;
    sort = { displayOrder: 1, createdAt: -1 };
  } else if (type === 'recent') sort = { createdAt: -1 };
  else if (type === 'short-form') {
    // No duration field on model; return recent videos (could add duration filter later)
    sort = { createdAt: -1 };
  }

  const [items, total] = await Promise.all([
    Video.find(filter)
      .sort(sort)
      .populate('artist', ARTIST_POPULATE_SELECT)
      .skip(skip)
      .limit(limit)
      .lean(),
    Video.countDocuments(filter),
  ]);

  const videos = (items as unknown as Record<string, unknown>[]).map(shapeVideoListItem);

  return {
    statusCode: 200,
    data: {
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    message: 'Videos list loaded.',
  };
}

export async function getPublicVideoByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<PublicMediaServiceResult> {
  const doc = await findByIdOrSlug(Video, request.params.idOrSlug, { status: 'published' });
  if (!doc) throw new AppError('Video not found', 404);
  const populated = await Video.findById(doc._id).populate('artist', ARTIST_POPULATE_SELECT).lean();
  if (!populated) throw new AppError('Video not found', 404);
  const video = shapeVideoDetail(populated as unknown as Record<string, unknown>);
  return { statusCode: 200, data: { video }, message: 'Video loaded.' };
}

// ----- News -----

export async function listPublicNews(
  request: FastifyRequest<{
    Querystring: {
      category?: string;
      page?: string;
      limit?: string;
      status?: string;
      type?: string;
    };
  }>
): Promise<PublicMediaServiceResult> {
  const limit = parsePositiveInteger(request.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const category = parseString(request.query.category);
  const type = parseString(request.query.type);

  const base: Record<string, unknown> = { status: 'published' };
  if (category && category !== 'all') base.category = category;

  let filter: Record<string, unknown> = base;
  if (type === 'video') {
    filter = {
      $and: [
        base,
        {
          $or: [
            { hasVideo: true },
            { videoFileUrl: { $regex: /\S/ } },
            { embedUrl: { $regex: /\S/ } },
          ],
        },
      ],
    };
  }

  let sort: Record<string, 1 | -1> = { createdAt: -1 };
  if (type === 'featured') {
    filter.isFeatured = true;
    sort = { displayOrder: 1, createdAt: -1 };
  } else if (type === 'trending') sort = { views: -1, createdAt: -1 };
  else if (type === 'latest') sort = { createdAt: -1 };
  else if (type === 'video') sort = { createdAt: -1 };

  const [items, total] = await Promise.all([
    NewsArticle.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    NewsArticle.countDocuments(filter),
  ]);

  const articles = (items as unknown as Record<string, unknown>[]).map(shapeArticleListItem);

  return {
    statusCode: 200,
    data: {
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    message: 'News list loaded.',
  };
}

export async function getPublicNewsByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<PublicMediaServiceResult> {
  const doc = await findByIdOrSlug(NewsArticle, request.params.idOrSlug, { status: 'published' });
  if (!doc) throw new AppError('Article not found', 404);
  const article = shapeArticleDetail(doc as unknown as Record<string, unknown>);
  return { statusCode: 200, data: { article }, message: 'Article loaded.' };
}

// ----- Download (music / sermons) -----

export async function downloadPublicMusic(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<PublicMediaServiceResult> {
  const doc = await findByIdOrSlug(Music, request.params.idOrSlug, { status: 'published' });
  if (!doc) throw new AppError('Music not found', 404);
  const raw = doc;
  const id = new mongoose.Types.ObjectId(String(raw._id));
  const downloadUrl = typeof raw.downloadUrl === 'string' ? raw.downloadUrl.trim() : '';
  const audioUrl = typeof raw.audioUrl === 'string' ? raw.audioUrl.trim() : '';
  const target = downloadUrl || audioUrl;
  if (!target) throw new AppError('Download not available', 404);
  await Music.updateOne({ _id: id }, { $inc: { downloads: 1 } });
  return { statusCode: 302, message: 'Redirect', redirectUrl: target };
}

export async function downloadPublicVideo(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<PublicMediaServiceResult> {
  const doc = await findByIdOrSlug(Video, request.params.idOrSlug, { status: 'published' });
  if (!doc) throw new AppError('Video not found', 404);
  const raw = doc;
  const id = new mongoose.Types.ObjectId(String(raw._id));
  const fileField = typeof raw.videoFileUrl === 'string' ? raw.videoFileUrl.trim() : '';
  const legacy = typeof raw.videoUrl === 'string' ? raw.videoUrl.trim() : '';
  const candidate = fileField || legacy;
  if (!candidate || isLikelyYoutubeUrl(candidate)) {
    throw new AppError('Download not available', 404);
  }
  await Video.updateOne({ _id: id }, { $inc: { downloads: 1 } });
  return { statusCode: 302, message: 'Redirect', redirectUrl: candidate };
}
