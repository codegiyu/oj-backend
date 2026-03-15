/**
 * Community public API controller.
 * Returns wrapped responses { success, data, responseCode, message } for frontend getDataFromRequest.
 * Stub implementation until community models (devotionals, testimonies, prayer requests, polls, etc.) exist.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { sendResponse } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import { parsePositiveInteger } from '../../utils/helpers';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

function pagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

// ----- GET /public/community -----
export async function getCommunity(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  sendResponse(
    reply,
    200,
    {
      categoryCounts: {
        devotionals: 0,
        testimonies: 0,
        prayerRequests: 0,
        askAPastor: 0,
        polls: 0,
        resources: 0,
        promoteYourContent: 0,
      },
      featuredTestimonies: [],
      trendingDevotionals: [],
      activeDiscussions: [],
    },
    'Community data loaded.'
  );
}

// ----- GET /public/devotionals -----
export async function listDevotionals(
  request: FastifyRequest<{
    Querystring: { type?: string; category?: string; page?: string; limit?: string; status?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const limit = parsePositiveInteger(request.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const devotionals: Record<string, unknown>[] = [];
  sendResponse(
    reply,
    200,
    {
      devotionals,
      pagination: pagination(page, limit, 0),
    },
    'Devotionals list loaded.'
  );
}

// ----- GET /public/devotionals/:idOrSlug -----
export async function getDevotionalByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  // Stub: return 404 so frontend can show notFound, or return a minimal stub for testing
  throw new AppError('Devotional not found', 404);
}

// ----- GET /public/testimonies -----
export async function listTestimonies(
  request: FastifyRequest<{
    Querystring: { type?: string; category?: string; page?: string; limit?: string; status?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const limit = parsePositiveInteger(request.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  sendResponse(
    reply,
    200,
    {
      testimonies: [],
      pagination: pagination(page, limit, 0),
    },
    'Testimonies list loaded.'
  );
}

// ----- GET /public/testimonies/:idOrSlug -----
export async function getTestimonyByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  throw new AppError('Testimony not found', 404);
}

// ----- GET /public/prayer-requests -----
export async function listPrayerRequests(
  request: FastifyRequest<{
    Querystring: { status?: string; category?: string; page?: string; limit?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const limit = parsePositiveInteger(request.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  sendResponse(
    reply,
    200,
    {
      prayerRequests: [],
      pagination: pagination(page, limit, 0),
    },
    'Prayer requests list loaded.'
  );
}

// ----- GET /public/prayer-requests/:idOrSlug -----
export async function getPrayerRequestByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  throw new AppError('Prayer request not found', 404);
}

// ----- GET /public/ask-a-pastor/questions -----
export async function listAskAPastorQuestions(
  request: FastifyRequest<{
    Querystring: { status?: string; category?: string; page?: string; limit?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const limit = parsePositiveInteger(request.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  sendResponse(
    reply,
    200,
    {
      questions: [],
      pagination: pagination(page, limit, 0),
    },
    'Questions list loaded.'
  );
}

// ----- GET /public/ask-a-pastor/questions/:idOrSlug -----
export async function getAskAPastorQuestionByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  throw new AppError('Question not found', 404);
}

// ----- GET /public/ask-a-pastor/pastors -----
export async function listAskAPastorPastors(
  request: FastifyRequest<{ Querystring?: { page?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  sendResponse(reply, 200, { pastors: [] }, 'Pastors list loaded.');
}

// ----- GET /public/polls -----
export async function listPolls(
  request: FastifyRequest<{
    Querystring: { status?: string; page?: string; limit?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const limit = parsePositiveInteger(request.query?.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query?.page, 1, 1000);
  sendResponse(
    reply,
    200,
    {
      polls: [],
      pagination: pagination(page, limit, 0),
    },
    'Polls list loaded.'
  );
}

// ----- GET /public/polls/:idOrSlug -----
export async function getPollByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  throw new AppError('Poll not found', 404);
}

// ----- GET /public/artists -----
export async function listCommunityArtists(
  request: FastifyRequest<{ Querystring?: { page?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const limit = parsePositiveInteger(request.query?.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query?.page, 1, 1000);
  sendResponse(
    reply,
    200,
    {
      artists: [],
      pagination: pagination(page, limit, 0),
    },
    'Artists list loaded.'
  );
}

// ----- GET /public/artists/:idOrSlug -----
export async function getCommunityArtistByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  throw new AppError('Artist not found', 404);
}

// ----- GET /public/resources -----
export async function listResources(
  request: FastifyRequest<{
    Querystring: { type?: string; page?: string; limit?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const limit = parsePositiveInteger(request.query?.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query?.page, 1, 1000);
  sendResponse(
    reply,
    200,
    {
      resources: [],
      ebooks: [],
      templates: [],
      beats: [],
      wallpapers: [],
      affiliateProducts: [],
      pagination: pagination(page, limit, 0),
    },
    'Resources list loaded.'
  );
}

// ----- POST /public/prayer-requests -----
export async function submitPrayerRequest(
  request: FastifyRequest<{
    Body: { name?: string; email?: string; title: string; content: string; category?: string; urgent?: boolean };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body ?? {};
  if (!body.title || !body.content) {
    throw new AppError('Title and content are required', 400);
  }
  const prayerRequest = {
    _id: 'stub-' + Date.now(),
    title: body.title,
    content: body.content,
    author: body.name ?? 'Anonymous',
    category: body.category ?? '',
    prayers: 0,
    comments: 0,
    timeAgo: 'Just now',
    urgent: !!body.urgent,
  };
  sendResponse(reply, 201, { prayerRequest }, 'Prayer request submitted.');
}

// ----- POST /public/ask-a-pastor/questions -----
export async function submitQuestion(
  request: FastifyRequest<{
    Body: { name?: string; email?: string; question: string; category?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body ?? {};
  if (!body.question) {
    throw new AppError('Question is required', 400);
  }
  const question = {
    _id: 'stub-' + Date.now(),
    question: body.question,
    category: body.category ?? '',
    author: body.name ?? 'Anonymous',
    views: 0,
    answers: 0,
    timeAgo: 'Just now',
    urgent: false,
  };
  sendResponse(reply, 201, { question }, 'Question submitted.');
}

// ----- POST /public/testimonies -----
export async function submitTestimony(
  request: FastifyRequest<{
    Body: { name?: string; category?: string; content: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body ?? {};
  if (!body.content) {
    throw new AppError('Content is required', 400);
  }
  const testimony = {
    _id: 'stub-' + Date.now(),
    author: body.name ?? 'Anonymous',
    avatar: '',
    content: body.content,
    likes: 0,
    comments: 0,
    timeAgo: 'Just now',
    category: body.category ?? '',
  };
  sendResponse(reply, 201, { testimony }, 'Testimony submitted.');
}

// ----- POST /public/polls -----
export async function createPoll(
  request: FastifyRequest<{
    Body: { question: string; description?: string; category?: string; options: string[] };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body ?? {};
  if (!body.question || !Array.isArray(body.options) || body.options.length < 2) {
    throw new AppError('Question and at least 2 options are required', 400);
  }
  const options = body.options.slice(0, 6).map((text: string, i: number) => ({
    _id: 'opt-' + i,
    text,
    votes: 0,
    percentage: 0,
  }));
  const poll = {
    _id: 'stub-' + Date.now(),
    question: body.question,
    description: body.description ?? '',
    options,
    totalVotes: 0,
    status: 'active',
    timeAgo: 'Just now',
  };
  sendResponse(reply, 201, { poll }, 'Poll created.');
}

// ----- POST /public/polls/:idOrSlug/vote -----
export async function votePoll(
  request: FastifyRequest<{
    Params: { idOrSlug: string };
    Body: { optionId: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { idOrSlug } = request.params;
  const { optionId } = request.body ?? {};
  if (!optionId) {
    throw new AppError('optionId is required', 400);
  }
  // Stub: no persistence; return 404 so frontend can show "poll not found" until real backend
  throw new AppError('Poll not found', 404);
}
