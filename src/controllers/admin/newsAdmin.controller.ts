import { FastifyRequest, FastifyReply } from 'fastify';
import { NewsArticle } from '../../models/newsArticle';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import {
  generateUniqueSlug,
  parsePositiveInteger,
  parseSearch,
  parseString,
  normalizeSort,
} from '../../utils/helpers';
import { parseObjectId } from './admin.helpers';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status', 'views'];

function hasArticleVideoMedia(b: { videoFileUrl?: unknown; embedUrl?: unknown }): boolean {
  const vf = typeof b.videoFileUrl === 'string' ? b.videoFileUrl.trim() : '';
  const em = typeof b.embedUrl === 'string' ? b.embedUrl.trim() : '';
  return Boolean(vf || em);
}

function shapeNewsItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    content: raw.content,
    excerpt: raw.excerpt,
    coverImage: raw.coverImage,
    images: raw.images,
    audioUrl: raw.audioUrl ?? '',
    videoFileUrl: raw.videoFileUrl ?? '',
    embedUrl: raw.embedUrl ?? '',
    downloadUrl: raw.downloadUrl ?? '',
    category: raw.category,
    author: raw.author,
    status: raw.status,
    isFeatured: raw.isFeatured,
    displayOrder: raw.displayOrder,
    views: raw.views ?? 0,
    hasVideo: raw.hasVideo,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

export async function listAdminNews(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string; status?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const limit = parsePositiveInteger(request.query.limit, 25, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  const search = parseSearch(request.query.search);
  const status = parseString(request.query.status);
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, '-createdAt');

  const [items, total] = await Promise.all([
    NewsArticle.find(filter).sort(sortStr).skip(skip).limit(limit).lean(),
    NewsArticle.countDocuments(filter),
  ]);

  const news = (items as unknown as Record<string, unknown>[]).map(shapeNewsItem);

  sendResponse(
    reply,
    200,
    {
      news,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    },
    'News list loaded.'
  );
}

export async function getAdminNews(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const doc = await NewsArticle.findById(id).lean();
  if (!doc) throw new AppError('News article not found', 404);
  const raw = doc as unknown as Record<string, unknown>;
  sendResponse(reply, 200, { news: shapeNewsItem(raw) }, 'News article loaded.');
}

export async function createAdminNews(
  request: FastifyRequest<{
    Body: {
      title: string;
      content?: string;
      excerpt?: string;
      coverImage?: string;
      images?: string[];
      category?: string;
      author?: string;
      status?: 'draft' | 'published' | 'archived';
      isFeatured?: boolean;
      displayOrder?: number;
      hasVideo?: boolean;
      audioUrl?: string;
      videoFileUrl?: string;
      embedUrl?: string;
      downloadUrl?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body;
  if (!body?.title || typeof body.title !== 'string' || !body.title.trim()) {
    throw new AppError('Title is required', 400);
  }

  const slug = await generateUniqueSlug(NewsArticle, body.title.trim());

  const hasVideo = body.hasVideo !== undefined ? body.hasVideo : hasArticleVideoMedia(body);

  const news = await NewsArticle.create({
    title: body.title.trim(),
    slug,
    content: body.content ?? '',
    excerpt: body.excerpt ?? '',
    coverImage: body.coverImage ?? '',
    images: Array.isArray(body.images) ? body.images : [],
    audioUrl: body.audioUrl ?? '',
    videoFileUrl: body.videoFileUrl ?? '',
    embedUrl: body.embedUrl ?? '',
    downloadUrl: body.downloadUrl ?? '',
    category: body.category ?? '',
    author: body.author ?? '',
    status: body.status ?? 'draft',
    isFeatured: body.isFeatured ?? false,
    displayOrder: body.displayOrder ?? 0,
    hasVideo,
  });

  const populated = await NewsArticle.findById(news._id).lean();
  sendResponse(
    reply,
    201,
    { news: shapeNewsItem((populated ?? news) as unknown as Record<string, unknown>) },
    'News article created.'
  );
}

export async function updateAdminNews(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      title?: string;
      content?: string;
      excerpt?: string;
      coverImage?: string;
      images?: string[];
      category?: string;
      author?: string;
      status?: 'draft' | 'published' | 'archived';
      isFeatured?: boolean;
      displayOrder?: number;
      hasVideo?: boolean;
      audioUrl?: string;
      videoFileUrl?: string;
      embedUrl?: string;
      downloadUrl?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const news = await NewsArticle.findById(id);
  if (!news) throw new AppError('News article not found', 404);

  const body = request.body ?? {};
  if (body.title !== undefined) news.title = body.title;
  if (body.content !== undefined) news.content = body.content;
  if (body.excerpt !== undefined) news.excerpt = body.excerpt;
  if (body.coverImage !== undefined) news.coverImage = body.coverImage;
  if (body.images !== undefined)
    news.images = Array.isArray(body.images) ? body.images : news.images;
  if (body.audioUrl !== undefined) news.audioUrl = body.audioUrl;
  if (body.videoFileUrl !== undefined) news.videoFileUrl = body.videoFileUrl;
  if (body.embedUrl !== undefined) news.embedUrl = body.embedUrl;
  if (body.downloadUrl !== undefined) news.downloadUrl = body.downloadUrl;
  if (body.category !== undefined) news.category = body.category;
  if (body.author !== undefined) news.author = body.author;
  if (body.status !== undefined) news.status = body.status;
  if (body.isFeatured !== undefined) news.isFeatured = body.isFeatured;
  if (body.displayOrder !== undefined) news.displayOrder = body.displayOrder;
  if (body.hasVideo !== undefined) news.hasVideo = body.hasVideo;
  else if (body.videoFileUrl !== undefined || body.embedUrl !== undefined) {
    news.hasVideo = hasArticleVideoMedia({
      videoFileUrl: news.videoFileUrl,
      embedUrl: news.embedUrl,
    });
  }

  await news.save();

  const populated = await NewsArticle.findById(news._id).lean();
  sendResponse(
    reply,
    200,
    { news: shapeNewsItem((populated ?? news.toObject()) as unknown as Record<string, unknown>) },
    'News article updated.'
  );
}

export async function deleteAdminNews(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const result = await NewsArticle.findByIdAndDelete(id);
  if (!result) throw new AppError('News article not found', 404);
  sendResponse(reply, 200, { success: true }, 'News article deleted.');
}
