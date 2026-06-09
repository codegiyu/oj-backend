/**
 * Devotionals public API business logic.
 */

import type { FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parseString } from '../../utils/helpers';
import {
  applyFeaturedListFilter,
  applyTextSearch,
  parseListQueryParams,
} from '../../utils/publicListQuery';
import * as devotionalRepo from '../../repositories/community/devotional.repository';
import {
  shapeDevotionalListItem,
  shapeDevotionalDetail,
} from '../../controllers/public/community.helpers';
import { RELATED_DEVOTIONALS_LIMIT } from '../../constants/pagination';
import {
  isCompleteDevotional,
  mergePublicFilter,
  publishedTextContentCompletenessFilter,
} from '../../utils/contentCompleteness';
import { DEVOTIONAL_SORT_TYPES, pagination, resolveExplicitSort } from './shared';

export async function listDevotionals(
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

  let filter = mergePublicFilter(
    {
      status: 'published',
      ...(category && category !== 'all' ? { category } : {}),
      ...(type && !DEVOTIONAL_SORT_TYPES.has(type) ? { type } : {}),
    },
    publishedTextContentCompletenessFilter()
  );

  filter = applyTextSearch(filter, q, ['title', 'excerpt', 'content', 'category', 'author']);

  let sort: Record<string, 1 | -1> = { createdAt: -1 };

  if (explicitSort) {
    sort = resolveExplicitSort(explicitSort, sortPreset, mongoSort, 'views');
    filter = applyFeaturedListFilter(filter, sortPreset);
  } else if (type === 'popular') sort = { views: -1, createdAt: -1 };
  else if (type === 'latest') sort = { createdAt: -1 };
  else if (type) sort = { type: 1, createdAt: -1 };

  const { items, total } = await devotionalRepo.listPublishedDevotionals({
    filter,
    sort,
    skip,
    limit,
  });

  const devotionals = items.map(shapeDevotionalListItem);

  return {
    statusCode: 200,
    data: { devotionals, pagination: pagination(page, limit, total) },
    message: 'Devotionals list loaded.',
  };
}

export async function getDevotionalByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const doc = await devotionalRepo.findPublishedDevotionalByIdOrSlug(request.params.idOrSlug);
  if (!doc || !isCompleteDevotional(doc)) throw new AppError('Devotional not found', 404);

  const docOid = new mongoose.Types.ObjectId(String(doc._id));
  const populated = await devotionalRepo.findDevotionalByIdPopulated(String(docOid));
  const detailRaw = (populated ?? doc) as unknown as Record<string, unknown>;

  const category = doc.category as string | undefined;
  const related = category
    ? await devotionalRepo.findRelatedDevotionals(
        category,
        String(docOid),
        RELATED_DEVOTIONALS_LIMIT
      )
    : [];

  return {
    statusCode: 200,
    data: {
      devotional: shapeDevotionalDetail(detailRaw),
      relatedDevotionals: (related as unknown as Record<string, unknown>[]).map(
        shapeDevotionalListItem
      ),
    },
    message: 'Devotional loaded.',
  };
}
