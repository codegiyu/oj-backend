import { FastifyRequest, FastifyReply } from 'fastify';
import { NewsArticle } from '../../models/newsArticle';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug } from '../../utils/helpers';
import { parseObjectId } from './admin.helpers';
import * as adminNewsService from '../../services/adminNews.service';
import { shapeNewsItem } from '../../services/adminNews.service';
import {
  schedulePublishedContentRevalidation,
  scheduleFrontendRevalidation,
} from '../../services/frontendRevalidation.service';

function hasArticleVideoMedia(b: { videoFileUrl?: unknown; embedUrl?: unknown }): boolean {
  const vf = typeof b.videoFileUrl === 'string' ? b.videoFileUrl.trim() : '';
  const em = typeof b.embedUrl === 'string' ? b.embedUrl.trim() : '';
  return Boolean(vf || em);
}

export async function listAdminNews(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string; status?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await adminNewsService.listAdminNews(request);

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminNews(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await adminNewsService.getAdminNews(request);

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
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
  if ((body.status ?? 'draft') === 'published') {
    schedulePublishedContentRevalidation('news_item', String(news._id));
  }
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
  if (news.status === 'published') {
    schedulePublishedContentRevalidation('news_item', String(news._id));
  }
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
  scheduleFrontendRevalidation(['/', '/news', `/news/story/${String(id)}`]);
  sendResponse(reply, 200, { success: true }, 'News article deleted.');
}
