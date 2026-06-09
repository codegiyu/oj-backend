/**
 * Community resources public API business logic.
 */

import type { FastifyRequest } from 'fastify';
import { AppError } from '../../utils/AppError';
import { parseString } from '../../utils/helpers';
import {
  applyFeaturedListFilter,
  applyTextSearch,
  parseListQueryParams,
} from '../../utils/publicListQuery';
import * as resourceRepo from '../../repositories/community/resource.repository';
import {
  shapeResourceListItem,
  shapeResourceDetail,
} from '../../controllers/public/community.helpers';
import {
  isCompleteResource,
  mergePublicFilter,
  publishedResourceCompletenessFilter,
} from '../../utils/contentCompleteness';
import { DEFAULT_RESOURCE_LIST_SORT, pagination, resolveExplicitSort } from './shared';

export async function listResourceCounts(): Promise<{
  statusCode: number;
  data: unknown;
  message: string;
}> {
  const { all, byType } = await resourceRepo.countPublishedResourcesByType();

  return {
    statusCode: 200,
    data: { all, byType },
    message: 'Resource counts loaded.',
  };
}

export async function listResources(
  request: FastifyRequest<{
    Querystring: { type?: string; page?: string; limit?: string; q?: string; sort?: string };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const { page, limit, skip, q, sortPreset, mongoSort } = parseListQueryParams(request.query);
  const type = parseString(request.query?.type);
  const explicitSort = parseString(request.query?.sort);

  let base: Record<string, unknown> = { status: 'published' };
  if (type) base.type = type;

  base = applyTextSearch(base, q, ['title', 'description', 'type', 'category']);

  let filter = mergePublicFilter(base, publishedResourceCompletenessFilter());

  if (explicitSort && sortPreset === 'featured') {
    filter = applyFeaturedListFilter(filter, sortPreset);
  }

  const sort = explicitSort
    ? resolveExplicitSort(explicitSort, sortPreset, mongoSort, 'downloads')
    : DEFAULT_RESOURCE_LIST_SORT;

  const { items, total } = await resourceRepo.listPublishedResources({ filter, skip, limit, sort });

  const resources = items.map(shapeResourceListItem);
  return {
    statusCode: 200,
    data: { resources, pagination: pagination(page, limit, total) },
    message: 'Resources list loaded.',
  };
}

export async function getResourceByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const doc = await resourceRepo.findPublishedResourceByIdOrSlug(request.params.idOrSlug);
  if (!doc || !isCompleteResource(doc)) throw new AppError('Resource not found', 404);

  return {
    statusCode: 200,
    data: { resource: shapeResourceDetail(doc) },
    message: 'Resource loaded.',
  };
}
