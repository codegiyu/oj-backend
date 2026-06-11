/* eslint-disable no-extra-boolean-cast */
import type { FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import { leanIdToString } from '../utils/leanId';
import { parseString } from '../utils/helpers';
import {
  applyTextSearch,
  parseListQueryParams,
  withPopularSortField,
} from '../utils/publicListQuery';
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
import { resolveChartScopeKey } from '../constants/musicSections';
import {
  buildBreakingNewsSectionFilter,
  buildTrendingNewsSectionFilter,
} from '../constants/newsSections';
import { buildVideoDurationBucketFilter } from '../constants/videoSections';
import { resolveDownloadRedirectUrl } from './r2.service';
import { getChartList } from './musicCharts.service';
import { getTrendingNewsList, getTrendingVideosList } from './mediaTrending.service';
import { applyArtistMusicScopeToFilter } from '../utils/artistMusicFilter';

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
      q?: string;
      sort?: string;
    };
  }>
): Promise<PublicMediaServiceResult> {
  const { page, limit, skip, q, sortPreset, mongoSort } = parseListQueryParams(request.query);
  const status = parseString(request.query.status);
  const category = parseString(request.query.category);
  const excludeCategory = parseString(request.query.excludeCategory);
  const artistId = parseString(request.query.artist);
  const type = parseString(request.query.type);
  const period = parseString(request.query.period);
  const explicitSort = parseString(request.query.sort);

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

  let filter: Record<string, unknown> = {};
  if (status === 'published') filter.status = 'published';
  else filter.status = 'published'; // public: only published
  if (category && category !== 'all') filter.category = category;
  else if (excludeCategory && excludeCategory !== 'all') filter.category = { $ne: excludeCategory };
  if (artistId && mongoose.Types.ObjectId.isValid(artistId)) {
    filter = await applyArtistMusicScopeToFilter(filter, new mongoose.Types.ObjectId(artistId));
  }

  filter = applyTextSearch(filter, q, ['title', 'excerpt']);

  if (type === 'trending') {
    const scopeKey = resolveChartScopeKey(category);
    const { items, total } = await getChartList({
      scopeKey,
      period: 'weekly',
      page,
      limit,
    });
    const music = items.map((item, i) => {
      const shaped = shapeMusicListItem(item.music, i, 'trending');

      return {
        ...shaped,
        plays: item.periodPlays,
        periodPlays: item.periodPlays,
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

  let sort: Record<string, 1 | -1> = { createdAt: -1 };

  if (explicitSort) {
    sort = sortPreset === 'popular' ? withPopularSortField(mongoSort, 'plays') : { ...mongoSort };
    if (sortPreset === 'featured') {
      filter.isFeatured = true;
    }
  } else if (type === 'featured') {
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
      q?: string;
      sort?: string;
    };
  }>
): Promise<PublicMediaServiceResult> {
  const { page, limit, skip, q, sortPreset, mongoSort } = parseListQueryParams(request.query);
  const status = parseString(request.query.status);
  const category = parseString(request.query.category);
  const artistId = parseString(request.query.artist);
  const type = parseString(request.query.type);
  const explicitSort = parseString(request.query.sort);

  let filter: Record<string, unknown> = {};
  if (status === 'published') filter.status = 'published';
  else filter.status = 'published';
  if (category && category !== 'all') filter.category = category;
  if (artistId && mongoose.Types.ObjectId.isValid(artistId)) {
    filter.artist = new mongoose.Types.ObjectId(artistId);
  }

  filter = applyTextSearch(filter, q, ['title', 'description']);

  const completeFilter = mergePublicFilter(filter, publishedVideoCompletenessFilter());

  if (type === 'trending') {
    const { items, total } = await getTrendingVideosList({
      filter: completeFilter,
      page,
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

  let sort: Record<string, 1 | -1> = { createdAt: -1 };

  if (explicitSort) {
    sort = sortPreset === 'popular' ? withPopularSortField(mongoSort, 'views') : { ...mongoSort };
    if (sortPreset === 'featured') {
      filter.isFeatured = true;
    }
  } else if (type === 'featured') {
    filter.isFeatured = true;
    sort = { displayOrder: 1, createdAt: -1 };
  } else if (type === 'recent') sort = { createdAt: -1 };
  else if (
    type === 'short-form' ||
    type === 'under-5' ||
    type === '5-10' ||
    type === '10-20' ||
    type === 'long-form'
  ) {
    Object.assign(filter, buildVideoDurationBucketFilter(type));
    sort = { createdAt: -1 };
  }

  const videoCompleteFilter = mergePublicFilter(filter, publishedVideoCompletenessFilter());
  const { items, total } = await videoRepo.listPublishedVideos({
    filter: videoCompleteFilter,
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
      q?: string;
      sort?: string;
    };
  }>
): Promise<PublicMediaServiceResult> {
  const { page, limit, skip, q, sortPreset, mongoSort } = parseListQueryParams(request.query);
  const category = parseString(request.query.category);
  const type = parseString(request.query.type);
  const explicitSort = parseString(request.query.sort);

  let base: Record<string, unknown> = { status: 'published' };
  if (category && category !== 'all') base.category = category;

  base = applyTextSearch(base, q, ['title', 'excerpt']);

  let filter = mergePublicFilter(base, publishedTextContentCompletenessFilter());

  if (type === 'video') {
    filter = mergePublicFilter(filter, {
      $or: [{ hasVideo: true }, { videoFileUrl: { $regex: /\S/ } }, { embedUrl: { $regex: /\S/ } }],
    });
  }

  if (type === 'trending') {
    filter = mergePublicFilter(filter, buildTrendingNewsSectionFilter());
    const { items, total } = await getTrendingNewsList({
      filter,
      page,
      limit,
    });
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

  let sort: Record<string, 1 | -1> = { createdAt: -1 };

  if (explicitSort) {
    sort = sortPreset === 'popular' ? withPopularSortField(mongoSort, 'views') : { ...mongoSort };
    if (sortPreset === 'featured') {
      filter = mergePublicFilter(filter, { isFeatured: true });
    }
  } else if (type === 'featured') {
    filter = mergePublicFilter(filter, { isFeatured: true });
    sort = { displayOrder: 1, createdAt: -1 };
  } else if (type === 'latest') sort = { createdAt: -1 };
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
