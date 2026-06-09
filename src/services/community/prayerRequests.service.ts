/**
 * Prayer requests public API business logic.
 */

import type { FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parseString, generateUniqueSlug } from '../../utils/helpers';
import { applyTextSearch, parseListQueryParams } from '../../utils/publicListQuery';
import {
  listPrayerRequests as queryPrayerRequests,
  findPrayerRequestByIdOrSlug,
  createPrayerRequest,
  incrementPrayerCount,
} from '../../repositories/community/prayerRequest.repository';
import {
  hasPrayerSolidarity,
  createPrayerSolidarity,
} from '../../repositories/community/prayerSolidarity.repository';
import {
  shapePrayerRequestListItem,
  shapePrayerRequestDetail,
} from '../../controllers/public/community.helpers';
import { PrayerRequest } from '../../models/prayerRequest';
import {
  isCompletePrayerRequest,
  mergePublicFilter,
  publishedTextContentCompletenessFilter,
} from '../../utils/contentCompleteness';
import { getAuthUser } from '../../utils/getAuthUser';
import {
  buildCategoryCounts,
  DEFAULT_NEWEST_SORT,
  getSolidarityIdentifier,
  pagination,
  resolveExplicitSort,
} from './shared';

export async function listPrayerRequests(
  request: FastifyRequest<{
    Querystring: {
      status?: string;
      category?: string;
      page?: string;
      limit?: string;
      q?: string;
      sort?: string;
    };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const { page, limit, skip, q, sortPreset, mongoSort } = parseListQueryParams(request.query);
  const status = parseString(request.query.status);
  const category = parseString(request.query.category);
  const explicitSort = parseString(request.query.sort);

  let base: Record<string, unknown> = {};
  if (status) base.status = status;
  if (category && category !== 'all') base.category = category;

  base = applyTextSearch(base, q, ['title', 'content', 'author', 'category']);

  const filter = mergePublicFilter(base, publishedTextContentCompletenessFilter());
  const sort = explicitSort
    ? resolveExplicitSort(explicitSort, sortPreset, mongoSort, 'prayers')
    : DEFAULT_NEWEST_SORT;

  const { items, total } = await queryPrayerRequests({ filter, skip, limit, sort });

  const prayerRequests = items.map(shapePrayerRequestListItem);

  return {
    statusCode: 200,
    data: { prayerRequests, pagination: pagination(page, limit, total) },
    message: 'Prayer requests list loaded.',
  };
}

export async function getPrayerRequestByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const doc = await findPrayerRequestByIdOrSlug(request.params.idOrSlug);
  if (!doc || !isCompletePrayerRequest(doc)) throw new AppError('Prayer request not found', 404);

  return {
    statusCode: 200,
    data: { prayerRequest: shapePrayerRequestDetail(doc) },
    message: 'Prayer request loaded.',
  };
}

export async function submitPrayerRequest(
  request: FastifyRequest<{
    Body: {
      name?: string;
      email?: string;
      title: string;
      content: string;
      category?: string;
      urgent?: boolean;
    };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const body = request.body ?? {};
  const auth = getAuthUser(request);
  const slug = await generateUniqueSlug(PrayerRequest, body.title.trim().slice(0, 50) || 'prayer');
  const raw = await createPrayerRequest({
    title: body.title,
    slug,
    content: body.content,
    author: (body.name as string)?.trim() || 'Anonymous',
    submittedBy:
      auth?.userId && mongoose.Types.ObjectId.isValid(auth.userId)
        ? new mongoose.Types.ObjectId(auth.userId)
        : null,
    email: (body.email as string)?.trim() || '',
    category: (body.category as string)?.trim() || '',
    prayers: 0,
    comments: 0,
    urgent: !!body.urgent,
    status: 'active',
  });

  return {
    statusCode: 201,
    data: { prayerRequest: shapePrayerRequestDetail(raw) },
    message: 'Prayer request submitted.',
  };
}

export async function recordPrayerForRequest(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const { idOrSlug } = request.params;

  const prayerDoc = await findPrayerRequestByIdOrSlug(idOrSlug);
  if (!prayerDoc) throw new AppError('Prayer request not found', 404);

  const status = prayerDoc.status as string;
  if (status !== 'active') throw new AppError('Prayer request is not active', 400);

  const prayerRequestId = new mongoose.Types.ObjectId(String(prayerDoc._id));
  const voterIdentifier = getSolidarityIdentifier(request);
  const alreadyPrayed = await hasPrayerSolidarity(prayerRequestId, voterIdentifier);

  if (alreadyPrayed) {
    throw new AppError('Already sent a prayer for this request', 409);
  }

  await createPrayerSolidarity({
    prayerRequest: prayerRequestId,
    voterIdentifier,
  });

  const prayers = await incrementPrayerCount(prayerRequestId);
  if (prayers == null) throw new AppError('Prayer request not found', 404);

  return {
    statusCode: 200,
    data: { prayers },
    message: 'Prayer sent.',
  };
}

export async function getPrayerRequestsHub(): Promise<{
  statusCode: number;
  data: unknown;
  message: string;
}> {
  const publishedFilter = mergePublicFilter({}, publishedTextContentCompletenessFilter());

  const [activeResult, answeredResult] = await Promise.all([
    queryPrayerRequests({ filter: { ...publishedFilter, status: 'active' }, skip: 0, limit: 50 }),
    queryPrayerRequests({
      filter: { ...publishedFilter, status: 'answered' },
      skip: 0,
      limit: 50,
    }),
  ]);

  const activeRequests = activeResult.items.map(shapePrayerRequestListItem);
  const answeredPrayers = answeredResult.items.map(shapePrayerRequestListItem);
  const categoryCounts = buildCategoryCounts(activeRequests);

  return {
    statusCode: 200,
    data: { activeRequests, answeredPrayers, categoryCounts },
    message: 'Prayer requests hub loaded.',
  };
}
