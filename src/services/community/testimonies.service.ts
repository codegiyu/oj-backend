/**
 * Testimonies public API business logic.
 */

import type { FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parseString, generateUniqueSlug } from '../../utils/helpers';
import { applyTextSearch, parseListQueryParams } from '../../utils/publicListQuery';
import * as testimonyRepo from '../../repositories/community/testimony.repository';
import {
  shapeTestimonyListItem,
  shapeTestimonyDetail,
} from '../../controllers/public/community.helpers';
import { Testimony } from '../../models/testimony';
import {
  isCompleteTestimony,
  mergePublicFilter,
  publishedTextContentCompletenessFilter,
} from '../../utils/contentCompleteness';
import { getAuthUser } from '../../utils/getAuthUser';
import { pagination, resolveExplicitSort } from './shared';

export async function listTestimonies(
  request: FastifyRequest<{
    Querystring: {
      type?: string;
      category?: string;
      page?: string;
      limit?: string;
      status?: string;
      q?: string;
      sort?: string;
    };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const { page, limit, skip, q, sortPreset, mongoSort } = parseListQueryParams(request.query);
  const type = parseString(request.query.type);
  const category = parseString(request.query.category);
  const explicitSort = parseString(request.query.sort);

  let base: Record<string, unknown> = { status: 'published' };
  if (category && category !== 'all') base.category = category;
  if (type === 'featured') base.isFeatured = true;

  base = applyTextSearch(base, q, ['content', 'author', 'category']);

  let filter = mergePublicFilter(base, publishedTextContentCompletenessFilter());

  let sort: Record<string, 1 | -1>;

  if (explicitSort) {
    sort = resolveExplicitSort(explicitSort, sortPreset, mongoSort, 'likes');
    if (sortPreset === 'featured') {
      filter = mergePublicFilter(filter, { isFeatured: true });
    }
  } else {
    sort =
      type === 'latest' || type === 'all' ? { createdAt: -1 } : { isFeatured: -1, createdAt: -1 };
  }

  const { items, total } = await testimonyRepo.listPublishedTestimonies({
    filter,
    sort,
    skip,
    limit,
  });

  let testimonies = items.map(shapeTestimonyListItem);

  if (type === 'featured' && testimonies.length === 0) {
    const fallback = await testimonyRepo.listPublishedTestimonies({
      filter: mergePublicFilter({ status: 'published' }, publishedTextContentCompletenessFilter()),
      sort: { createdAt: -1 },
      skip: 0,
      limit: 3,
    });
    testimonies = fallback.items.map(shapeTestimonyListItem);
  }

  return {
    statusCode: 200,
    data: { testimonies, pagination: pagination(page, limit, total) },
    message: 'Testimonies list loaded.',
  };
}

export async function getTestimonyByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const doc = await testimonyRepo.findPublishedTestimonyByIdOrSlug(request.params.idOrSlug);
  if (!doc || !isCompleteTestimony(doc)) throw new AppError('Testimony not found', 404);

  return {
    statusCode: 200,
    data: { testimony: shapeTestimonyDetail(doc) },
    message: 'Testimony loaded.',
  };
}

export async function submitTestimony(
  request: FastifyRequest<{
    Body: { name?: string; category?: string; content: string };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const body = request.body ?? {};
  const auth = getAuthUser(request);
  const baseSlug = body.content.trim().slice(0, 30) || (body.name as string) || 'testimony';
  const slug = await generateUniqueSlug(Testimony, baseSlug);
  const raw = await testimonyRepo.createTestimony({
    slug,
    author: (body.name as string)?.trim() || 'Anonymous',
    submittedBy:
      auth?.userId && mongoose.Types.ObjectId.isValid(auth.userId)
        ? new mongoose.Types.ObjectId(auth.userId)
        : null,
    content: body.content,
    category: (body.category as string)?.trim() || '',
    likes: 0,
    comments: 0,
    status: 'published',
    isFeatured: false,
    displayOrder: 0,
  });

  return {
    statusCode: 201,
    data: { testimony: shapeTestimonyDetail(raw) },
    message: 'Testimony submitted.',
  };
}
