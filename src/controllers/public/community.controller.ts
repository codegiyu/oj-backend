/**
 * Community public API controller.
 * Returns wrapped responses { success, data, responseCode, message } for frontend getDataFromRequest.
 * Uses Devotional, Testimony, PrayerRequest, AskPastorQuestion, Pastor, Poll, PollVote, Resource, Artist.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { sendResponse } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import { parsePositiveInteger, parseString, generateUniqueSlug } from '../../utils/helpers';
import {
  Devotional,
  Testimony,
  PrayerRequest,
  AskPastorQuestion,
  Pastor,
  Poll,
  PollVote,
  Resource,
} from '../../models';
import { Artist } from '../../models/artist';
import {
  findByIdOrSlug,
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
} from './community.helpers';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;
const FEATURED_TESTIMONIES_LIMIT = 6;
const TRENDING_DEVOTIONALS_LIMIT = 6;
const RELATED_DEVOTIONALS_LIMIT = 6;

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

// ----- GET /public/community -----
export async function getCommunity(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const [devotionalsCount, testimoniesCount, prayerRequestsCount, questionsCount, pollsCount, resourcesCount] =
    await Promise.all([
      Devotional.countDocuments({ status: 'published' }),
      Testimony.countDocuments({ status: 'published' }),
      PrayerRequest.countDocuments({}),
      AskPastorQuestion.countDocuments({}),
      Poll.countDocuments({}),
      Resource.countDocuments({ status: 'published' }),
    ]);

  const [featuredTestimonies, trendingDevotionals] = await Promise.all([
    Testimony.find({ status: 'published', isFeatured: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(FEATURED_TESTIMONIES_LIMIT)
      .lean(),
    Devotional.find({ status: 'published' })
      .sort({ views: -1, createdAt: -1 })
      .limit(TRENDING_DEVOTIONALS_LIMIT)
      .lean(),
  ]);

  sendResponse(
    reply,
    200,
    {
      categoryCounts: {
        devotionals: devotionalsCount,
        testimonies: testimoniesCount,
        prayerRequests: prayerRequestsCount,
        askAPastor: questionsCount,
        polls: pollsCount,
        resources: resourcesCount,
        promoteYourContent: 0,
      },
      featuredTestimonies: (featuredTestimonies as Record<string, unknown>[]).map(shapeTestimonyListItem),
      trendingDevotionals: (trendingDevotionals as Record<string, unknown>[]).map(shapeDevotionalListItem),
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
  const skip = (page - 1) * limit;
  const type = parseString(request.query.type);
  const category = parseString(request.query.category);

  const filter: Record<string, unknown> = { status: 'published' };
  if (category && category !== 'all') filter.category = category;
  if (type) filter.type = type;

  let sort: Record<string, 1 | -1> = { createdAt: -1 };
  if (type === 'popular') sort = { views: -1, createdAt: -1 };
  else if (type === 'latest') sort = { createdAt: -1 };
  else if (type) sort = { type: 1, createdAt: -1 };

  const [items, total] = await Promise.all([
    Devotional.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Devotional.countDocuments(filter),
  ]);

  const devotionals = (items as Record<string, unknown>[]).map(shapeDevotionalListItem);
  sendResponse(reply, 200, { devotionals, pagination: pagination(page, limit, total) }, 'Devotionals list loaded.');
}

// ----- GET /public/devotionals/:idOrSlug -----
export async function getDevotionalByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const doc = await findByIdOrSlug(Devotional, request.params.idOrSlug, { status: 'published' });
  if (!doc) throw new AppError('Devotional not found', 404);

  const category = doc.category as string | undefined;
  const related =
    category
      ? await Devotional.find({ status: 'published', category, _id: { $ne: doc._id } })
          .sort({ createdAt: -1 })
          .limit(RELATED_DEVOTIONALS_LIMIT)
          .lean()
      : [];

  sendResponse(
    reply,
    200,
    {
      devotional: shapeDevotionalDetail(doc as Record<string, unknown>),
      relatedDevotionals: (related as Record<string, unknown>[]).map(shapeDevotionalListItem),
    },
    'Devotional loaded.'
  );
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
  const skip = (page - 1) * limit;
  const type = parseString(request.query.type);
  const category = parseString(request.query.category);

  const filter: Record<string, unknown> = { status: 'published' };
  if (category && category !== 'all') filter.category = category;
  if (type === 'featured') filter.isFeatured = true;

  const sort: Record<string, 1 | -1> =
    type === 'latest' || type === 'all' ? { createdAt: -1 } : { isFeatured: -1, createdAt: -1 };

  const [items, total] = await Promise.all([
    Testimony.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Testimony.countDocuments(filter),
  ]);

  const testimonies = (items as Record<string, unknown>[]).map(shapeTestimonyListItem);
  sendResponse(reply, 200, { testimonies, pagination: pagination(page, limit, total) }, 'Testimonies list loaded.');
}

// ----- GET /public/testimonies/:idOrSlug -----
export async function getTestimonyByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const doc = await findByIdOrSlug(Testimony, request.params.idOrSlug, { status: 'published' });
  if (!doc) throw new AppError('Testimony not found', 404);
  sendResponse(reply, 200, { testimony: shapeTestimonyDetail(doc as Record<string, unknown>) }, 'Testimony loaded.');
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
  const skip = (page - 1) * limit;
  const status = parseString(request.query.status);
  const category = parseString(request.query.category);

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (category && category !== 'all') filter.category = category;

  const [items, total] = await Promise.all([
    PrayerRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PrayerRequest.countDocuments(filter),
  ]);

  const prayerRequests = (items as Record<string, unknown>[]).map(shapePrayerRequestListItem);
  sendResponse(
    reply,
    200,
    { prayerRequests, pagination: pagination(page, limit, total) },
    'Prayer requests list loaded.'
  );
}

// ----- GET /public/prayer-requests/:idOrSlug -----
export async function getPrayerRequestByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const doc = await findByIdOrSlug(PrayerRequest, request.params.idOrSlug, {});
  if (!doc) throw new AppError('Prayer request not found', 404);
  sendResponse(
    reply,
    200,
    { prayerRequest: shapePrayerRequestDetail(doc as Record<string, unknown>) },
    'Prayer request loaded.'
  );
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
  const skip = (page - 1) * limit;
  const status = parseString(request.query.status);
  const category = parseString(request.query.category);

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (category && category !== 'all') filter.category = category;

  const [items, total] = await Promise.all([
    AskPastorQuestion.find(filter).sort({ createdAt: -1 }).populate('pastor').skip(skip).limit(limit).lean(),
    AskPastorQuestion.countDocuments(filter),
  ]);

  const questions = (items as Record<string, unknown>[]).map((raw) => {
    const pastor = raw.pastor as Record<string, unknown> | null | undefined;
    return shapeQuestionListItem(raw as Record<string, unknown>, pastor ?? null);
  });
  sendResponse(reply, 200, { questions, pagination: pagination(page, limit, total) }, 'Questions list loaded.');
}

// ----- GET /public/ask-a-pastor/questions/:idOrSlug -----
export async function getAskAPastorQuestionByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const doc = await findByIdOrSlug(AskPastorQuestion, request.params.idOrSlug, {});
  if (!doc) throw new AppError('Question not found', 404);
  const populated = await AskPastorQuestion.findById((doc as Record<string, unknown>)._id)
    .populate('pastor')
    .lean();
  if (!populated) throw new AppError('Question not found', 404);
  const raw = populated as unknown as Record<string, unknown>;
  const pastor = raw.pastor as Record<string, unknown> | null | undefined;
  sendResponse(
    reply,
    200,
    { question: shapeQuestionDetail(raw, pastor ?? null) },
    'Question loaded.'
  );
}

// ----- GET /public/ask-a-pastor/pastors -----
export async function listAskAPastorPastors(
  request: FastifyRequest<{ Querystring?: { page?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const limit = parsePositiveInteger(request.query?.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query?.page, 1, 1000);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Pastor.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Pastor.countDocuments({ isActive: true }),
  ]);

  const pastors = (items as Record<string, unknown>[]).map(shapePastorListItem);
  sendResponse(reply, 200, { pastors, pagination: pagination(page, limit, total) }, 'Pastors list loaded.');
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
  const skip = (page - 1) * limit;
  const status = parseString(request.query?.status);

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Poll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Poll.countDocuments(filter),
  ]);

  const polls = (items as Record<string, unknown>[]).map(shapePollListItem);
  sendResponse(reply, 200, { polls, pagination: pagination(page, limit, total) }, 'Polls list loaded.');
}

// ----- GET /public/polls/:idOrSlug -----
export async function getPollByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const doc = await findByIdOrSlug(Poll, request.params.idOrSlug, {});
  if (!doc) throw new AppError('Poll not found', 404);
  sendResponse(reply, 200, { poll: shapePollDetail(doc as Record<string, unknown>) }, 'Poll loaded.');
}

// ----- GET /public/artists -----
export async function listCommunityArtists(
  request: FastifyRequest<{ Querystring?: { page?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const limit = parsePositiveInteger(request.query?.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query?.page, 1, 1000);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Artist.find({ isActive: true }).sort({ displayOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Artist.countDocuments({ isActive: true }),
  ]);

  const artists = (items as Record<string, unknown>[]).map(shapeArtistListItem);
  sendResponse(reply, 200, { artists, pagination: pagination(page, limit, total) }, 'Artists list loaded.');
}

// ----- GET /public/artists/:idOrSlug -----
export async function getCommunityArtistByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const doc = await findByIdOrSlug(Artist, request.params.idOrSlug, { isActive: true });
  if (!doc) throw new AppError('Artist not found', 404);
  sendResponse(reply, 200, { artist: shapeArtistDetail(doc as Record<string, unknown>) }, 'Artist loaded.');
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
  const skip = (page - 1) * limit;
  const type = parseString(request.query?.type);

  const filter: Record<string, unknown> = { status: 'published' };
  if (type) filter.type = type;

  const [items, total] = await Promise.all([
    Resource.find(filter).sort({ displayOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Resource.countDocuments(filter),
  ]);

  const resources = (items as Record<string, unknown>[]).map(shapeResourceListItem);
  sendResponse(reply, 200, { resources, pagination: pagination(page, limit, total) }, 'Resources list loaded.');
}

// ----- POST /public/prayer-requests -----
export async function submitPrayerRequest(
  request: FastifyRequest<{
    Body: { name?: string; email?: string; title: string; content: string; category?: string; urgent?: boolean };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body ?? {};
  const slug = await generateUniqueSlug(PrayerRequest, (body.title as string).trim().slice(0, 50) || 'prayer');
  const doc = await PrayerRequest.create({
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
  const raw = doc.toObject ? doc.toObject() : (doc as unknown as Record<string, unknown>);
  sendResponse(reply, 201, { prayerRequest: shapePrayerRequestDetail(raw) }, 'Prayer request submitted.');
}

// ----- POST /public/ask-a-pastor/questions -----
export async function submitQuestion(
  request: FastifyRequest<{
    Body: { name?: string; email?: string; question: string; category?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body ?? {};
  const baseSlug = (body.question as string).trim().slice(0, 40) || 'question';
  const slug = await generateUniqueSlug(AskPastorQuestion, baseSlug);
  const doc = await AskPastorQuestion.create({
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
  const raw = doc.toObject ? doc.toObject() : (doc as unknown as Record<string, unknown>);
  sendResponse(reply, 201, { question: shapeQuestionDetail(raw, null) }, 'Question submitted.');
}

// ----- POST /public/testimonies -----
export async function submitTestimony(
  request: FastifyRequest<{
    Body: { name?: string; category?: string; content: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body ?? {};
  const baseSlug = (body.content as string).trim().slice(0, 30) || (body.name as string) || 'testimony';
  const slug = await generateUniqueSlug(Testimony, baseSlug);
  const doc = await Testimony.create({
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
  const raw = doc.toObject ? doc.toObject() : (doc as unknown as Record<string, unknown>);
  sendResponse(reply, 201, { testimony: shapeTestimonyDetail(raw) }, 'Testimony submitted.');
}

// ----- POST /public/polls -----
export async function createPoll(
  request: FastifyRequest<{
    Body: { question: string; description?: string; category?: string; options: string[] };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body ?? {};
  const slug = await generateUniqueSlug(Poll, (body.question as string).trim().slice(0, 40) || 'poll');
  const optionTexts = (body.options as string[]).slice(0, 6).filter(Boolean);
  if (optionTexts.length < 2) throw new AppError('At least 2 options are required', 400);

  const options = optionTexts.map((text) => ({ _id: new mongoose.Types.ObjectId(), text, votes: 0 }));
  const doc = await Poll.create({
    question: body.question,
    slug,
    description: (body.description as string)?.trim() || '',
    category: (body.category as string)?.trim() || '',
    options,
    status: 'active',
    totalVotes: 0,
  });
  const raw = doc.toObject ? doc.toObject() : (doc as unknown as Record<string, unknown>);
  sendResponse(reply, 201, { poll: shapePollDetail(raw) }, 'Poll created.');
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
  if (!optionId) throw new AppError('optionId is required', 400);

  const pollDoc = await findByIdOrSlug(Poll, idOrSlug, {});
  if (!pollDoc) throw new AppError('Poll not found', 404);

  const status = pollDoc.status as string;
  if (status !== 'active') throw new AppError('Poll is closed', 400);

  const optionIdObj = new mongoose.Types.ObjectId(optionId);
  const options = (pollDoc.options as { _id: mongoose.Types.ObjectId; text: string; votes: number }[]) ?? [];
  const optionIndex = options.findIndex(
    (o) => o._id != null && String(o._id) === String(optionId)
  );
  if (optionIndex === -1) throw new AppError('Invalid option', 400);

  const voterIdentifier = getVoterIdentifier(request);
  const existingVote = await PollVote.findOne({
    poll: (pollDoc as Record<string, unknown>)._id,
    voterIdentifier,
  });
  if (existingVote) {
    throw new AppError('Already voted', 409);
  }

  await PollVote.create({
    poll: (pollDoc as Record<string, unknown>)._id,
    optionId: optionIdObj,
    voterIdentifier,
  });

  const pollId = (pollDoc as Record<string, unknown>)._id as mongoose.Types.ObjectId;
  await Poll.updateOne(
    { _id: pollId },
    {
      $inc: { totalVotes: 1, [`options.${optionIndex}.votes`]: 1 },
    }
  );

  const updated = await Poll.findById(pollId).lean();
  if (!updated) throw new AppError('Poll not found', 404);

  sendResponse(reply, 200, { poll: shapePollDetail(updated as Record<string, unknown>) }, 'Vote recorded.');
}
