/**
 * Community public API business logic.
 */

import type { FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import { parsePositiveInteger, parseString, generateUniqueSlug } from '../utils/helpers';
import * as devotionalRepo from '../repositories/community/devotional.repository';
import * as testimonyRepo from '../repositories/community/testimony.repository';
import {
  countPrayerRequests,
  listPrayerRequests as queryPrayerRequests,
  findPrayerRequestByIdOrSlug,
  findRecentActivePrayerRequests,
  createPrayerRequest,
  incrementPrayerCount,
} from '../repositories/community/prayerRequest.repository';
import {
  hasPrayerSolidarity,
  createPrayerSolidarity,
} from '../repositories/community/prayerSolidarity.repository';
import * as askPastorRepo from '../repositories/community/askPastor.repository';
import * as pastorRepo from '../repositories/community/pastor.repository';
import * as pollRepo from '../repositories/community/poll.repository';
import * as resourceRepo from '../repositories/community/resource.repository';
import {
  countActiveCommunityArtists,
  listActiveCommunityArtists,
  findActiveArtistByIdOrSlug,
} from '../repositories/community/artist.repository';
import { PrayerRequest } from '../models/prayerRequest';
import { AskPastorQuestion } from '../models/askPastorQuestion';
import { Testimony } from '../models/testimony';
import { Poll } from '../models/poll';
import {
  shapeDevotionalListItem,
  shapeDevotionalDetail,
  shapeTestimonyListItem,
  shapeTestimonyDetail,
  shapePrayerRequestListItem,
  shapePrayerRequestDetail,
  shapePastorListItem,
  shapeQuestionListItem,
  shapeQuestionDetail,
  shapePollListItem,
  shapePollDetail,
  shapeArtistListItem,
  shapeArtistDetail,
  shapeResourceListItem,
} from '../controllers/public/community.helpers';

import {
  PUBLIC_LIST_DEFAULT_LIMIT as DEFAULT_LIMIT,
  PUBLIC_LIST_MAX_LIMIT as MAX_LIMIT,
  FEATURED_TESTIMONIES_LIMIT,
  TRENDING_DEVOTIONALS_LIMIT,
  RELATED_DEVOTIONALS_LIMIT,
  RECENT_PRAYER_REQUESTS_LIMIT,
} from '../constants/pagination';
import {
  isCompleteDevotional,
  isCompletePrayerRequest,
  isCompleteTestimony,
  mergePublicFilter,
  publishedResourceCompletenessFilter,
  publishedTextContentCompletenessFilter,
} from '../utils/contentCompleteness';
import { getAuthUser } from '../utils/getAuthUser';

function pagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

/** Get voter identifier for poll vote (cookie, header, or IP+UA). */
function getVoterIdentifier(request: FastifyRequest): string {
  const cookies = request.cookies as { voter_id?: string } | undefined;
  const header = request.headers['x-voter-id'];
  if (cookies?.voter_id) return cookies.voter_id;
  if (typeof header === 'string' && header.trim()) return header.trim();
  const ip = request.ip ?? '';
  const ua = request.headers['user-agent'] ?? '';
  return `${ip}-${ua}`.slice(0, 200);
}

/** Prefer authenticated user id for dedupe; fall back to session voter id. */
function getSolidarityIdentifier(request: FastifyRequest): string {
  const auth = getAuthUser(request);
  if (auth?.userId) return `user:${auth.userId}`;

  return getVoterIdentifier(request);
}

// ----- GET /public/community -----
export async function getCommunity(): Promise<{
  statusCode: number;
  data: unknown;
  message: string;
}> {
  const [
    devotionalsCount,
    testimoniesCount,
    prayerRequestsCount,
    questionsCount,
    pollsCount,
    resourcesCount,
    artistsCount,
  ] = await Promise.all([
    devotionalRepo.countPublishedDevotionals(),
    testimonyRepo.countPublishedTestimonies(),
    countPrayerRequests(),
    askPastorRepo.countAskPastorQuestions(),
    pollRepo.countPolls(),
    resourceRepo.countPublishedResources(),
    countActiveCommunityArtists(),
  ]);

  const [featuredTestimonies, trendingDevotionals, recentPrayerRequests] = await Promise.all([
    testimonyRepo.findFeaturedTestimonies(FEATURED_TESTIMONIES_LIMIT),
    devotionalRepo.findTrendingDevotionals(TRENDING_DEVOTIONALS_LIMIT),
    findRecentActivePrayerRequests(RECENT_PRAYER_REQUESTS_LIMIT),
  ]);

  return {
    statusCode: 200,
    data: {
      categoryCounts: {
        devotionals: devotionalsCount,
        testimonies: testimoniesCount,
        prayerRequests: prayerRequestsCount,
        askAPastor: questionsCount,
        polls: pollsCount,
        resources: resourcesCount,
        artists: artistsCount,
        promoteYourContent: 0,
      },
      featuredTestimonies: (featuredTestimonies as unknown as Record<string, unknown>[]).map(
        shapeTestimonyListItem
      ),
      trendingDevotionals: (trendingDevotionals as unknown as Record<string, unknown>[]).map(
        shapeDevotionalListItem
      ),
      recentPrayerRequests: (recentPrayerRequests as unknown as Record<string, unknown>[]).map(
        shapePrayerRequestListItem
      ),
    },
    message: 'Community data loaded.',
  };
}

// ----- GET /public/devotionals -----
export async function listDevotionals(
  request: FastifyRequest<{
    Querystring: {
      type?: string;
      category?: string;
      page?: string;
      limit?: string;
      status?: string;
    };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const limit = parsePositiveInteger(request.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const type = parseString(request.query.type);
  const category = parseString(request.query.category);

  const filter = mergePublicFilter(
    {
      status: 'published',
      ...(category && category !== 'all' ? { category } : {}),
      ...(type ? { type } : {}),
    },
    publishedTextContentCompletenessFilter()
  );

  let sort: Record<string, 1 | -1> = { createdAt: -1 };
  if (type === 'popular') sort = { views: -1, createdAt: -1 };
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

// ----- GET /public/devotionals/:idOrSlug -----
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

// ----- GET /public/testimonies -----
export async function listTestimonies(
  request: FastifyRequest<{
    Querystring: {
      type?: string;
      category?: string;
      page?: string;
      limit?: string;
      status?: string;
    };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const limit = parsePositiveInteger(request.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const type = parseString(request.query.type);
  const category = parseString(request.query.category);

  const base: Record<string, unknown> = { status: 'published' };
  if (category && category !== 'all') base.category = category;
  if (type === 'featured') base.isFeatured = true;

  const filter = mergePublicFilter(base, publishedTextContentCompletenessFilter());

  const sort: Record<string, 1 | -1> =
    type === 'latest' || type === 'all' ? { createdAt: -1 } : { isFeatured: -1, createdAt: -1 };

  const { items, total } = await testimonyRepo.listPublishedTestimonies({
    filter,
    sort,
    skip,
    limit,
  });

  const testimonies = items.map(shapeTestimonyListItem);
  return {
    statusCode: 200,
    data: { testimonies, pagination: pagination(page, limit, total) },
    message: 'Testimonies list loaded.',
  };
}

// ----- GET /public/testimonies/:idOrSlug -----
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

// ----- GET /public/prayer-requests -----
export async function listPrayerRequests(
  request: FastifyRequest<{
    Querystring: { status?: string; category?: string; page?: string; limit?: string };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const limit = parsePositiveInteger(request.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const status = parseString(request.query.status);
  const category = parseString(request.query.category);

  const base: Record<string, unknown> = {};
  if (status) base.status = status;
  if (category && category !== 'all') base.category = category;

  const filter = mergePublicFilter(base, publishedTextContentCompletenessFilter());

  const { items, total } = await queryPrayerRequests({ filter, skip, limit });

  const prayerRequests = items.map(shapePrayerRequestListItem);
  return {
    statusCode: 200,
    data: { prayerRequests, pagination: pagination(page, limit, total) },
    message: 'Prayer requests list loaded.',
  };
}

// ----- GET /public/prayer-requests/:idOrSlug -----
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

// ----- GET /public/ask-a-pastor/questions -----
export async function listAskAPastorQuestions(
  request: FastifyRequest<{
    Querystring: { status?: string; category?: string; page?: string; limit?: string };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const limit = parsePositiveInteger(request.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const status = parseString(request.query.status);
  const category = parseString(request.query.category);

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (category && category !== 'all') filter.category = category;

  const { items, total } = await askPastorRepo.listAskPastorQuestions({ filter, skip, limit });

  const questions = items.map(raw => {
    const pastor = raw.pastor as Record<string, unknown> | null | undefined;
    return shapeQuestionListItem(raw, pastor ?? null);
  });
  return {
    statusCode: 200,
    data: { questions, pagination: pagination(page, limit, total) },
    message: 'Questions list loaded.',
  };
}

// ----- GET /public/ask-a-pastor/questions/:idOrSlug -----
export async function getAskAPastorQuestionByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const doc = await askPastorRepo.findAskPastorQuestionByIdOrSlug(request.params.idOrSlug);
  if (!doc) throw new AppError('Question not found', 404);
  const populated = await askPastorRepo.findAskPastorQuestionByIdPopulated(doc._id);
  if (!populated) throw new AppError('Question not found', 404);
  const raw = populated as unknown as Record<string, unknown>;
  const pastor = raw.pastor as Record<string, unknown> | null | undefined;
  return {
    statusCode: 200,
    data: { question: shapeQuestionDetail(raw, pastor ?? null) },
    message: 'Question loaded.',
  };
}

// ----- GET /public/ask-a-pastor/pastors -----
export async function listAskAPastorPastors(
  request: FastifyRequest<{ Querystring?: { page?: string; limit?: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const limit = parsePositiveInteger(request.query?.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query?.page, 1, 1000);
  const skip = (page - 1) * limit;

  const { items, total } = await pastorRepo.listActivePastors({ skip, limit });

  const pastors = items.map(shapePastorListItem);
  return {
    statusCode: 200,
    data: { pastors, pagination: pagination(page, limit, total) },
    message: 'Pastors list loaded.',
  };
}

// ----- GET /public/polls -----
export async function listPolls(
  request: FastifyRequest<{
    Querystring: { status?: string; page?: string; limit?: string };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const limit = parsePositiveInteger(request.query?.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query?.page, 1, 1000);
  const skip = (page - 1) * limit;
  const status = parseString(request.query?.status);

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const { items, total } = await pollRepo.listPolls({ filter, skip, limit });

  const polls = items.map(shapePollListItem);
  return {
    statusCode: 200,
    data: { polls, pagination: pagination(page, limit, total) },
    message: 'Polls list loaded.',
  };
}

// ----- GET /public/polls/:idOrSlug -----
export async function getPollByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const doc = await pollRepo.findPollByIdOrSlug(request.params.idOrSlug);
  if (!doc) throw new AppError('Poll not found', 404);
  return { statusCode: 200, data: { poll: shapePollDetail(doc) }, message: 'Poll loaded.' };
}

// ----- GET /public/artists -----
export async function listCommunityArtists(
  request: FastifyRequest<{ Querystring?: { page?: string; limit?: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const limit = parsePositiveInteger(request.query?.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query?.page, 1, 1000);
  const skip = (page - 1) * limit;

  const { items, total } = await listActiveCommunityArtists({ skip, limit });

  const artists = items.map(shapeArtistListItem);
  return {
    statusCode: 200,
    data: { artists, pagination: pagination(page, limit, total) },
    message: 'Artists list loaded.',
  };
}

// ----- GET /public/artists/:idOrSlug -----
export async function getCommunityArtistByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const doc = await findActiveArtistByIdOrSlug(request.params.idOrSlug);
  if (!doc) throw new AppError('Artist not found', 404);
  return { statusCode: 200, data: { artist: shapeArtistDetail(doc) }, message: 'Artist loaded.' };
}

// ----- GET /public/resources -----
export async function listResources(
  request: FastifyRequest<{
    Querystring: { type?: string; page?: string; limit?: string };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const limit = parsePositiveInteger(request.query?.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query?.page, 1, 1000);
  const skip = (page - 1) * limit;
  const type = parseString(request.query?.type);

  const base: Record<string, unknown> = { status: 'published' };
  if (type) base.type = type;

  const filter = mergePublicFilter(base, publishedResourceCompletenessFilter());

  const { items, total } = await resourceRepo.listPublishedResources({ filter, skip, limit });

  const resources = items.map(shapeResourceListItem);
  return {
    statusCode: 200,
    data: { resources, pagination: pagination(page, limit, total) },
    message: 'Resources list loaded.',
  };
}

// ----- POST /public/prayer-requests -----
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
  const slug = await generateUniqueSlug(PrayerRequest, body.title.trim().slice(0, 50) || 'prayer');
  const raw = await createPrayerRequest({
    title: body.title,
    slug,
    content: body.content,
    author: (body.name as string)?.trim() || 'Anonymous',
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

// ----- POST /public/ask-a-pastor/questions -----
export async function submitQuestion(
  request: FastifyRequest<{
    Body: { name?: string; email?: string; question: string; category?: string };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const body = request.body ?? {};
  const baseSlug = body.question.trim().slice(0, 40) || 'question';
  const slug = await generateUniqueSlug(AskPastorQuestion, baseSlug);
  const raw = await askPastorRepo.createAskPastorQuestion({
    question: body.question,
    slug,
    author: (body.name as string)?.trim() || 'Anonymous',
    email: (body.email as string)?.trim() || '',
    category: (body.category as string)?.trim() || '',
    status: 'active',
    views: 0,
    helpful: 0,
    urgent: false,
  });
  return {
    statusCode: 201,
    data: { question: shapeQuestionDetail(raw, null) },
    message: 'Question submitted.',
  };
}

// ----- POST /public/testimonies -----
export async function submitTestimony(
  request: FastifyRequest<{
    Body: { name?: string; category?: string; content: string };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const body = request.body ?? {};
  const baseSlug = body.content.trim().slice(0, 30) || (body.name as string) || 'testimony';
  const slug = await generateUniqueSlug(Testimony, baseSlug);
  const raw = await testimonyRepo.createTestimony({
    slug,
    author: (body.name as string)?.trim() || 'Anonymous',
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

// ----- POST /public/polls -----
export async function createPoll(
  request: FastifyRequest<{
    Body: { question: string; description?: string; category?: string; options: string[] };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const body = request.body ?? {};
  const slug = await generateUniqueSlug(Poll, body.question.trim().slice(0, 40) || 'poll');
  const optionTexts = body.options.slice(0, 6).filter(Boolean);
  if (optionTexts.length < 2) throw new AppError('At least 2 options are required', 400);

  const options = optionTexts.map(text => ({ _id: new mongoose.Types.ObjectId(), text, votes: 0 }));
  const raw = await pollRepo.createPoll({
    question: body.question,
    slug,
    description: (body.description as string)?.trim() || '',
    category: (body.category as string)?.trim() || '',
    options,
    status: 'active',
    totalVotes: 0,
  });
  return { statusCode: 201, data: { poll: shapePollDetail(raw) }, message: 'Poll created.' };
}

// ----- POST /public/polls/:idOrSlug/vote -----
export async function votePoll(
  request: FastifyRequest<{
    Params: { idOrSlug: string };
    Body: { optionId: string };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const { idOrSlug } = request.params;
  const { optionId } = request.body ?? {};
  if (!optionId) throw new AppError('optionId is required', 400);

  const pollDoc = await pollRepo.findPollByIdOrSlug(idOrSlug);
  if (!pollDoc) throw new AppError('Poll not found', 404);

  const status = pollDoc.status as string;
  if (status !== 'active') throw new AppError('Poll is closed', 400);

  const optionIdObj = new mongoose.Types.ObjectId(optionId);
  const options =
    (pollDoc.options as { _id: mongoose.Types.ObjectId; text: string; votes: number }[]) ?? [];
  const optionIndex = options.findIndex(o => o._id != null && String(o._id) === String(optionId));
  if (optionIndex === -1) throw new AppError('Invalid option', 400);

  const auth = getAuthUser(request);
  if (!auth?.userId) {
    throw new AppError('Authentication required to vote', 401);
  }

  const voterIdentifier = `user:${auth.userId}`;
  const pollOid = new mongoose.Types.ObjectId(String(pollDoc._id));
  const existingVote = await pollRepo.findPollVote(pollOid, voterIdentifier);

  if (existingVote) {
    throw new AppError('Already voted', 409);
  }

  await pollRepo.createPollVote({
    poll: pollOid,
    optionId: optionIdObj,
    voterIdentifier,
  });

  await pollRepo.incrementPollVote(pollOid, optionIndex);

  const updated = await pollRepo.findPollById(String(pollOid));
  if (!updated) throw new AppError('Poll not found', 404);

  return {
    statusCode: 200,
    data: { poll: shapePollDetail(updated as unknown as Record<string, unknown>) },
    message: 'Vote recorded.',
  };
}

// ----- POST /public/prayer-requests/:idOrSlug/pray -----
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
