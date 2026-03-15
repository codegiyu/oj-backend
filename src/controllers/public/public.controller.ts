import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Music } from '../../models/music';
import { Video } from '../../models/video';
import { NewsArticle } from '../../models/newsArticle';
import { toArtistSummary } from '../artist/artist.helpers';
import type { PopulatedArtistDoc } from '../artist/artist.helpers';
import { ARTIST_POPULATE_SELECT } from '../artist/artist.helpers';
import { parsePositiveInteger, parseString } from '../../utils/helpers';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

/** Resolve document by id (ObjectId) or slug. Returns null if not found. */
async function findByIdOrSlug<T>(
  model: mongoose.Model<T>,
  idOrSlug: string,
  filter: Record<string, unknown> = {}
): Promise<Record<string, unknown> | null> {
  const q = { ...filter } as Record<string, unknown>;
  if (mongoose.Types.ObjectId.isValid(idOrSlug) && String(new mongoose.Types.ObjectId(idOrSlug)) === idOrSlug) {
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

function shapeMusicListItem(raw: Record<string, unknown>, index: number, type: string): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as PopulatedArtistDoc);
  const item: Record<string, unknown> = {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    coverImage: raw.coverImage,
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
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    lyrics: raw.lyrics,
    coverImage: raw.coverImage,
    audioUrl: raw.audioUrl,
    videoUrl: raw.videoUrl,
    category: raw.category,
    plays: raw.plays ?? 0,
    downloads: raw.downloads ?? 0,
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
    category: raw.category,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    ...(artist && { artist }),
  };
}

function shapeVideoDetail(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as PopulatedArtistDoc);
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    thumbnail: raw.thumbnail,
    videoUrl: raw.videoUrl,
    category: raw.category,
    views: raw.views ?? 0,
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
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    content: raw.content,
    excerpt: raw.excerpt,
    coverImage: raw.coverImage,
    images: Array.isArray(raw.images) ? raw.images : [],
    category: raw.category,
    author: raw.author,
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
  const type = parseString(request.query.type);

  const filter: Record<string, unknown> = {};
  if (status === 'published') filter.status = 'published';
  else filter.status = 'published'; // public: only published
  if (category && category !== 'all') filter.category = category;

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
    Music.find(filter).sort(sort).populate('artist', ARTIST_POPULATE_SELECT).skip(skip).limit(limit).lean(),
    Music.countDocuments(filter),
  ]);

  const music = (items as Record<string, unknown>[]).map((doc, i) =>
    shapeMusicListItem(doc, i, type ?? '')
  );

  await reply.status(200).send({
    music,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function getPublicMusicByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const doc = await findByIdOrSlug(Music, request.params.idOrSlug, { status: 'published' });
  if (!doc) {
    return reply.status(404).send({ error: 'Not Found', message: 'Music not found' });
  }
  const populated = await Music.findById((doc as Record<string, unknown>)._id)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean();
  if (!populated) {
    return reply.status(404).send({ error: 'Not Found', message: 'Music not found' });
  }
  const music = shapeMusicDetail(populated as unknown as Record<string, unknown>);
  await reply.status(200).send({ music });
}

// ----- Videos -----

export async function listPublicVideos(
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
  const status = parseString(request.query.status);
  const category = parseString(request.query.category);
  const type = parseString(request.query.type);

  const filter: Record<string, unknown> = {};
  if (status === 'published') filter.status = 'published';
  else filter.status = 'published';
  if (category && category !== 'all') filter.category = category;

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
    Video.find(filter).sort(sort).populate('artist', ARTIST_POPULATE_SELECT).skip(skip).limit(limit).lean(),
    Video.countDocuments(filter),
  ]);

  const videos = (items as Record<string, unknown>[]).map(shapeVideoListItem);

  await reply.status(200).send({
    videos,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function getPublicVideoByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const doc = await findByIdOrSlug(Video, request.params.idOrSlug, { status: 'published' });
  if (!doc) {
    return reply.status(404).send({ error: 'Not Found', message: 'Video not found' });
  }
  const populated = await Video.findById((doc as Record<string, unknown>)._id)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean();
  if (!populated) {
    return reply.status(404).send({ error: 'Not Found', message: 'Video not found' });
  }
  const video = shapeVideoDetail(populated as unknown as Record<string, unknown>);
  await reply.status(200).send({ video });
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
  const status = parseString(request.query.status);
  const category = parseString(request.query.category);
  const type = parseString(request.query.type);

  const filter: Record<string, unknown> = {};
  if (status === 'published') filter.status = 'published';
  else filter.status = 'published';
  if (category && category !== 'all') filter.category = category;
  if (type === 'video') filter.hasVideo = true;

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

  await reply.status(200).send({
    articles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function getPublicNewsByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const doc = await findByIdOrSlug(NewsArticle, request.params.idOrSlug, { status: 'published' });
  if (!doc) {
    return reply.status(404).send({ error: 'Not Found', message: 'Article not found' });
  }
  const article = shapeArticleDetail(doc as unknown as Record<string, unknown>);
  await reply.status(200).send({ article });
}
