/* eslint-disable no-extra-boolean-cast */
import type { FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import { leanIdToString } from '../utils/leanId';
import { parsePositiveInteger, parseString } from '../utils/helpers';
import { isLikelyYoutubeUrl } from '../utils/videoEmbed';
import {
  isCompleteMusic,
  isCompleteNewsArticle,
  isCompleteVideo,
  mergePublicFilter,
  publishedMusicCompletenessFilter,
  publishedTextContentCompletenessFilter,
  publishedVideoCompletenessFilter,
} from '../utils/contentCompleteness';
import * as musicRepo from '../repositories/public/music.repository';
import * as videoRepo from '../repositories/public/video.repository';
import * as newsRepo from '../repositories/public/news.repository';
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
import { resolveChartScopeKey } from '../constants/musicSections';
import { buildBreakingNewsSectionFilter } from '../constants/newsSections';
import {
  buildLongFormVideoSectionFilter,
  buildShortFormVideoSectionFilter,
} from '../constants/videoSections';
import { resolveDownloadRedirectUrl } from './r2.service';
import { getChartList } from './musicCharts.service';

function isHttpFileUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function buildDownloadFilename(title: unknown, ext: string): string {
  const raw = typeof title === 'string' ? title.trim() : '';
  const base = raw ? raw.replace(/[^\w.\-() ]+/g, '_').slice(0, 150) : 'download';

  return `${base}${ext}`;
}

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
  const period = parseString(request.query.period);

  if (type === 'charts') {
    const scopeKey = resolveChartScopeKey(category);
    const { items, total } = await getChartList({ scopeKey, period, page, limit });
    const music = items.map(item => {
      const shaped = shapeMusicListItem(item.music, item.rank - 1, 'charts');

      return {
        ...shaped,
        rank: item.rank,
        chartPosition: item.rank,
        trend: item.trend,
        change: item.change,
        ...(item.chartEntry ? { chartEntry: item.chartEntry } : {}),
        periodPlays: item.periodPlays,
        plays: item.periodPlays,
      };
    });

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

  const completeFilter = mergePublicFilter(filter, publishedMusicCompletenessFilter());
  const { items, total } = await musicRepo.listPublishedMusic({
    filter: completeFilter,
    sort,
    skip,
    limit,
  });

  const music = items.map((doc, i) => shapeMusicListItem(doc, i, type ?? ''));

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
  const doc = await musicRepo.findPublishedMusicByIdOrSlug(request.params.idOrSlug);
  if (!doc || !isCompleteMusic(doc)) throw new AppError('Music not found', 404);
  const populated = await musicRepo.findPublishedMusicByIdPopulated(doc._id);
  if (!populated || !isCompleteMusic(populated)) throw new AppError('Music not found', 404);
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
    Object.assign(filter, buildShortFormVideoSectionFilter());
    sort = { createdAt: -1 };
  } else if (type === 'long-form') {
    Object.assign(filter, buildLongFormVideoSectionFilter());
    sort = { createdAt: -1 };
  }

  const completeFilter = mergePublicFilter(filter, publishedVideoCompletenessFilter());
  const { items, total } = await videoRepo.listPublishedVideos({
    filter: completeFilter,
    sort,
    skip,
    limit,
  });

  const videos = items.map(shapeVideoListItem);

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
  const doc = await videoRepo.findPublishedVideoByIdOrSlug(request.params.idOrSlug);
  if (!doc || !isCompleteVideo(doc)) throw new AppError('Video not found', 404);
  const populated = await videoRepo.findPublishedVideoByIdPopulated(doc._id);
  if (!populated || !isCompleteVideo(populated)) throw new AppError('Video not found', 404);
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

  let filter = mergePublicFilter(base, publishedTextContentCompletenessFilter());

  if (type === 'video') {
    filter = mergePublicFilter(filter, {
      $or: [{ hasVideo: true }, { videoFileUrl: { $regex: /\S/ } }, { embedUrl: { $regex: /\S/ } }],
    });
  }

  let sort: Record<string, 1 | -1> = { createdAt: -1 };
  if (type === 'featured') {
    filter = mergePublicFilter(filter, { isFeatured: true });
    sort = { displayOrder: 1, createdAt: -1 };
  } else if (type === 'trending') sort = { views: -1, createdAt: -1 };
  else if (type === 'latest') sort = { createdAt: -1 };
  else if (type === 'video') sort = { createdAt: -1 };
  else if (type === 'breaking') {
    filter = mergePublicFilter(filter, buildBreakingNewsSectionFilter());
    sort = { priority: -1, createdAt: -1 };
  }

  const { items, total } = await newsRepo.listPublishedNews({ filter, sort, skip, limit });

  const articles = items.map(shapeArticleListItem);

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
  const doc = await newsRepo.findPublishedNewsByIdOrSlug(request.params.idOrSlug);
  if (!doc || !isCompleteNewsArticle(doc)) throw new AppError('Article not found', 404);
  const article = shapeArticleDetail(doc as unknown as Record<string, unknown>);
  return { statusCode: 200, data: { article }, message: 'Article loaded.' };
}

// ----- Download (music / sermons) -----

export async function downloadPublicMusic(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<PublicMediaServiceResult> {
  const doc = await musicRepo.findPublishedMusicByIdOrSlug(request.params.idOrSlug);
  if (!doc || !isCompleteMusic(doc)) throw new AppError('Music not found', 404);
  const raw = doc;

  if (Boolean(raw.isMonetizable)) {
    throw new AppError('Download requires purchase', 403);
  }

  const id = new mongoose.Types.ObjectId(leanIdToString(raw._id));
  const downloadUrl = typeof raw.downloadUrl === 'string' ? raw.downloadUrl.trim() : '';
  const audioUrl = typeof raw.audioUrl === 'string' ? raw.audioUrl.trim() : '';
  const targetUrl = downloadUrl || audioUrl;

  if (!targetUrl || !isHttpFileUrl(targetUrl)) {
    throw new AppError('Download not available', 404);
  }

  await musicRepo.incrementMusicDownloads(id);

  const redirectUrl = await resolveDownloadRedirectUrl(
    targetUrl,
    buildDownloadFilename(raw.title, '.mp3')
  );

  return { statusCode: 302, message: 'Redirect', redirectUrl };
}

export async function downloadPublicVideo(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<PublicMediaServiceResult> {
  const doc = await videoRepo.findPublishedVideoByIdOrSlug(request.params.idOrSlug);
  if (!doc || !isCompleteVideo(doc)) throw new AppError('Video not found', 404);
  const raw = doc;

  if (Boolean(raw.isMonetizable)) {
    throw new AppError('Download requires purchase', 403);
  }

  const id = new mongoose.Types.ObjectId(leanIdToString(raw._id));
  const fileField = typeof raw.videoFileUrl === 'string' ? raw.videoFileUrl.trim() : '';
  const legacy = typeof raw.videoUrl === 'string' ? raw.videoUrl.trim() : '';
  const candidate = fileField || legacy;
  if (!candidate || isLikelyYoutubeUrl(candidate) || !isHttpFileUrl(candidate)) {
    throw new AppError('Download not available', 404);
  }

  await videoRepo.incrementVideoDownloads(id);

  const redirectUrl = await resolveDownloadRedirectUrl(
    candidate,
    buildDownloadFilename(raw.title, '.mp4')
  );

  return { statusCode: 302, message: 'Redirect', redirectUrl };
}
