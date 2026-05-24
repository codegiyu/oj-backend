import type { FastifyRequest } from 'fastify';
import { AppError } from '../utils/AppError';
import { leanIdToString, parseObjectId } from '../controllers/admin/admin.helpers';
import { findAdminNewsById, listAdminNewsRows } from '../repositories/admin/news.repository';
import { parseAdminListQuery } from './admin/adminListQuery';
import { applyCategoryFilter } from './admin/adminListFilters';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status', 'views'];

export type AdminNewsServiceResult = {
  statusCode: number;
  data: unknown;
  message: string;
};

export function shapeNewsItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
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
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
      sort?: string;
      category?: string;
    };
  }>
): Promise<AdminNewsServiceResult> {
  const { page, limit, skip, filter, sort } = parseAdminListQuery(request.query, {
    sortFields: SORT_FIELDS,
    searchFields: ['title', 'content', 'excerpt', 'slug'],
  });
  applyCategoryFilter(filter, request.query.category);
  const { items, total } = await listAdminNewsRows({ filter, sort, skip, limit });
  const news = items.map(shapeNewsItem);

  return {
    statusCode: 200,
    data: {
      news,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    },
    message: 'News list loaded.',
  };
}

export async function getAdminNews(
  request: FastifyRequest<{ Params: { id: string } }>
): Promise<AdminNewsServiceResult> {
  const id = parseObjectId(request.params.id);
  const doc = await findAdminNewsById(String(id));

  if (!doc) {
    throw new AppError('News article not found', 404);
  }

  return { statusCode: 200, data: { news: shapeNewsItem(doc) }, message: 'News article loaded.' };
}
