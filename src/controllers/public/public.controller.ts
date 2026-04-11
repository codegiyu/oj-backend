import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { Music } from '../../models/music';
import { Video } from '../../models/video';
import { NewsArticle } from '../../models/newsArticle';
import { toArtistSummary } from '../artist/artist.helpers';
import type { PopulatedArtistDoc } from '../artist/artist.helpers';
import { ARTIST_POPULATE_SELECT } from '../artist/artist.helpers';
import { parsePositiveInteger, parseString } from '../../utils/helpers';
import { youtubeEmbedUrlFromInput, isLikelyYoutubeUrl } from '../../utils/videoEmbed';
import { ContentCategory } from '../../models/contentCategory';
import { HomeAdvert } from '../../models/homeAdvert';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

/** Resolve document by id (ObjectId) or slug. Returns null if not found. */
async function findByIdOrSlug<T>(
  model: mongoose.Model<T>,
  idOrSlug: string,
  filter: Record<string, unknown> = {}
): Promise<Record<string, unknown> | null> {
  const q = { ...filter } as Record<string, unknown>;
  if (
    mongoose.Types.ObjectId.isValid(idOrSlug) &&
    String(new mongoose.Types.ObjectId(idOrSlug)) === idOrSlug
  ) {
    q._id = new mongoose.Types.ObjectId(idOrSlug);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic filter built at runtime
    const byId = await model.findOne(q as any).lean();
    if (byId) return byId as Record<string, unknown>;
  }
  delete q._id;
  q.slug = idOrSlug;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic filter built at runtime
  const bySlug = await model.findOne(q as any).lean();
  return bySlug as Record<string, unknown> | null;
}

function shapeMusicListItem(
  raw: Record<string, unknown>,
  index: number,
  type: string
): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as PopulatedArtistDoc);
  const item: Record<string, unknown> = {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    coverImage: raw.coverImage,
    excerpt: raw.excerpt ?? '',
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    category: raw.category,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    ...(artist && { artist }),
  };
  if (type === 'charts') {
    item.chartPosition = index + 1;
    item.rank = index + 1;
  }
  return item;
}

function shapeMusicDetail(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as PopulatedArtistDoc);
  const videoUrlStr = typeof raw.videoUrl === 'string' ? raw.videoUrl : '';
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    lyrics: raw.lyrics,
    excerpt: raw.excerpt ?? '',
    coverImage: raw.coverImage,
    audioUrl: raw.audioUrl,
    videoUrl: raw.videoUrl,
    downloadUrl: raw.downloadUrl ?? '',
    category: raw.category,
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    downloads: raw.downloads ?? 0,
    youtubeEmbedUrl: youtubeEmbedUrlFromInput(videoUrlStr),
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    ...(artist && { artist }),
  };
}

function shapeVideoListItem(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as PopulatedArtistDoc);
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    thumbnail: raw.thumbnail,
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    downloads: raw.downloads ?? 0,
    category: raw.category,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    ...(artist && { artist }),
  };
}

function shapeVideoDetail(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as PopulatedArtistDoc);
  const legacyUrl = typeof raw.videoUrl === 'string' ? raw.videoUrl : '';
  const fileFromField = typeof raw.videoFileUrl === 'string' ? raw.videoFileUrl.trim() : '';
  const videoFileUrl =
    fileFromField || (legacyUrl && !isLikelyYoutubeUrl(legacyUrl) ? legacyUrl : '');
  const embedField = typeof raw.embedUrl === 'string' ? raw.embedUrl.trim() : '';
  const embedUrl = embedField || (legacyUrl && isLikelyYoutubeUrl(legacyUrl) ? legacyUrl : '');
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    thumbnail: raw.thumbnail,
    videoUrl: raw.videoUrl,
    videoFileUrl,
    embedUrl,
    youtubeEmbedUrl: youtubeEmbedUrlFromInput(embedUrl),
    category: raw.category,
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    downloads: raw.downloads ?? 0,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    ...(artist && { artist }),
  };
}

function shapeArticleListItem(raw: Record<string, unknown>): Record<string, unknown> {
  const excerpt = raw.excerpt ?? (typeof raw.content === 'string' ? raw.content.slice(0, 160) : '');
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    excerpt: excerpt || raw.excerpt,
    category: raw.category,
    coverImage: raw.coverImage,
    author: raw.author,
    views: raw.views ?? 0,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
  };
}

function shapeArticleDetail(raw: Record<string, unknown>): Record<string, unknown> {
  const embedRaw = typeof raw.embedUrl === 'string' ? raw.embedUrl : '';
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    content: raw.content,
    excerpt: raw.excerpt,
    coverImage: raw.coverImage,
    images: Array.isArray(raw.images) ? raw.images : [],
    audioUrl: raw.audioUrl ?? '',
    videoFileUrl: raw.videoFileUrl ?? '',
    embedUrl: embedRaw,
    downloadUrl: raw.downloadUrl ?? '',
    youtubeEmbedUrl: youtubeEmbedUrlFromInput(embedRaw),
    category: raw.category,
    author: raw.author,
    hasVideo: raw.hasVideo ?? false,
    views: raw.views ?? 0,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

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
  }>,
  reply: FastifyReply
): Promise<void> {
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

  const music = (items as Record<string, unknown>[]).map((doc, i) =>
    shapeMusicListItem(doc, i, type ?? '')
  );

  sendResponse(
    reply,
    200,
    {
      music,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    'Music list loaded.'
  );
}

export async function getPublicMusicByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const doc = await findByIdOrSlug(Music, request.params.idOrSlug, { status: 'published' });
  if (!doc) throw new AppError('Music not found', 404);
  const populated = await Music.findById(doc._id).populate('artist', ARTIST_POPULATE_SELECT).lean();
  if (!populated) throw new AppError('Music not found', 404);
  const music = shapeMusicDetail(populated as unknown as Record<string, unknown>);
  sendResponse(reply, 200, { music }, 'Music loaded.');
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
  }>,
  reply: FastifyReply
): Promise<void> {
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

  const videos = (items as Record<string, unknown>[]).map(shapeVideoListItem);

  sendResponse(
    reply,
    200,
    {
      videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    'Videos list loaded.'
  );
}

export async function getPublicVideoByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const doc = await findByIdOrSlug(Video, request.params.idOrSlug, { status: 'published' });
  if (!doc) throw new AppError('Video not found', 404);
  const populated = await Video.findById(doc._id).populate('artist', ARTIST_POPULATE_SELECT).lean();
  if (!populated) throw new AppError('Video not found', 404);
  const video = shapeVideoDetail(populated as unknown as Record<string, unknown>);
  sendResponse(reply, 200, { video }, 'Video loaded.');
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
  }>,
  reply: FastifyReply
): Promise<void> {
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

  const articles = (items as Record<string, unknown>[]).map(shapeArticleListItem);

  sendResponse(
    reply,
    200,
    {
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    'News list loaded.'
  );
}

export async function getPublicNewsByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const doc = await findByIdOrSlug(NewsArticle, request.params.idOrSlug, { status: 'published' });
  if (!doc) throw new AppError('Article not found', 404);
  const article = shapeArticleDetail(doc as unknown as Record<string, unknown>);
  sendResponse(reply, 200, { article }, 'Article loaded.');
}

// ----- Download (music / sermons) -----

export async function downloadPublicMusic(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const doc = await findByIdOrSlug(Music, request.params.idOrSlug, { status: 'published' });
  if (!doc) throw new AppError('Music not found', 404);
  const raw = doc;
  const id = raw._id;
  const downloadUrl = typeof raw.downloadUrl === 'string' ? raw.downloadUrl.trim() : '';
  const audioUrl = typeof raw.audioUrl === 'string' ? raw.audioUrl.trim() : '';
  const target = downloadUrl || audioUrl;
  if (!target) throw new AppError('Download not available', 404);
  await Music.updateOne({ _id: id }, { $inc: { downloads: 1 } });
  reply.code(302);
  await reply.redirect(target);
}

export async function downloadPublicVideo(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const doc = await findByIdOrSlug(Video, request.params.idOrSlug, { status: 'published' });
  if (!doc) throw new AppError('Video not found', 404);
  const raw = doc;
  const id = raw._id;
  const fileField = typeof raw.videoFileUrl === 'string' ? raw.videoFileUrl.trim() : '';
  const legacy = typeof raw.videoUrl === 'string' ? raw.videoUrl.trim() : '';
  const candidate = fileField || legacy;
  if (!candidate || isLikelyYoutubeUrl(candidate)) {
    throw new AppError('Download not available', 404);
  }
  await Video.updateOne({ _id: id }, { $inc: { downloads: 1 } });
  reply.code(302);
  await reply.redirect(candidate);
}

// ----- Content categories & home adverts (public) -----

export async function listPublicContentCategories(
  request: FastifyRequest<{ Querystring: { scope?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const scope = parseString(request.query.scope);
  const filter: Record<string, unknown> = { isActive: true };
  if (scope && ['music', 'video', 'news', 'devotional'].includes(scope)) filter.scope = scope;
  const items = await ContentCategory.find(filter).sort({ displayOrder: 1, name: 1 }).lean();
  const categories = (items as Record<string, unknown>[]).map(c => ({
    _id: c._id != null ? String(c._id) : c._id,
    name: c.name,
    slug: c.slug,
    scope: c.scope,
  }));
  sendResponse(reply, 200, { categories }, 'Content categories loaded.');
}

export async function listPublicHomeAdverts(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const items = await HomeAdvert.find({ isActive: true }).sort({ slot: 1, displayOrder: 1 }).lean();
  const adverts = (items as Record<string, unknown>[]).map(a => ({
    _id: a._id != null ? String(a._id) : a._id,
    slot: a.slot,
    imageUrl: a.imageUrl,
    linkUrl: a.linkUrl,
    displayOrder: a.displayOrder ?? 0,
  }));
  sendResponse(reply, 200, { adverts }, 'Home adverts loaded.');
}
