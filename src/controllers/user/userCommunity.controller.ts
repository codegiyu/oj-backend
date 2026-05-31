import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { AskPastorQuestion } from '../../models/askPastorQuestion';
import { Testimony } from '../../models/testimony';
import { PrayerRequest } from '../../models/prayerRequest';
import { AppError } from '../../utils/AppError';
import { getAuthUser } from '../../utils/getAuthUser';
import { sendResponse } from '../../utils/response';
import { parsePositiveInteger, parseString } from '../../utils/helpers';
import { submitterQuestionFilter } from '../../services/pastor.service';
import { shapeTestimonyDetail, shapePrayerRequestDetail } from '../public/community.helpers';
import { shapePastorQuestionDetail } from '../pastor/pastor.helpers';

function requireClientAuth(request: FastifyRequest): string {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  if (!mongoose.Types.ObjectId.isValid(auth.userId)) throw new AppError('Invalid user id', 400);

  return auth.userId;
}

/** GET /user/me/community/questions */
export async function listMyCommunityQuestions(
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string; status?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const userId = new mongoose.Types.ObjectId(requireClientAuth(request));
  const limit = parsePositiveInteger(request.query.limit, 10, 100);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const status = parseString(request.query.status);

  const filter: Record<string, unknown> = submitterQuestionFilter(userId);
  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    AskPastorQuestion.find(filter)
      .sort({ createdAt: -1 })
      .populate('requestedPastor', 'name slug image title church')
      .populate('pastor', 'name slug image title church')
      .skip(skip)
      .limit(limit)
      .lean(),
    AskPastorQuestion.countDocuments(filter),
  ]);

  sendResponse(
    reply,
    200,
    {
      questions: items.map(item =>
        shapePastorQuestionDetail(item as unknown as Record<string, unknown>)
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    },
    'Your questions loaded.'
  );
}

/** GET /user/me/community/questions/:id */
export async function getMyCommunityQuestion(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const userId = new mongoose.Types.ObjectId(requireClientAuth(request));
  if (!mongoose.Types.ObjectId.isValid(request.params.id)) throw new AppError('Invalid id', 400);

  const doc = await AskPastorQuestion.findOne({
    _id: new mongoose.Types.ObjectId(request.params.id),
    submittedBy: userId,
  })
    .populate('requestedPastor')
    .populate('pastor')
    .populate('answers.pastor', 'name slug image title church')
    .lean();

  if (!doc) throw new AppError('Question not found', 404);

  sendResponse(
    reply,
    200,
    { question: shapePastorQuestionDetail(doc as unknown as Record<string, unknown>) },
    'Question loaded.'
  );
}

/** PATCH /user/me/community/questions/:id/close */
export async function closeMyCommunityQuestion(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const userId = new mongoose.Types.ObjectId(requireClientAuth(request));
  if (!mongoose.Types.ObjectId.isValid(request.params.id)) throw new AppError('Invalid id', 400);

  const question = await AskPastorQuestion.findOne({
    _id: new mongoose.Types.ObjectId(request.params.id),
    submittedBy: userId,
  });

  if (!question) throw new AppError('Question not found', 404);
  if (question.status === 'closed') throw new AppError('Question is already closed', 409);

  question.status = 'closed';
  question.closedAt = new Date();
  question.closedBy = userId;
  await question.save();

  sendResponse(
    reply,
    200,
    {
      question: shapePastorQuestionDetail(
        question.toObject() as unknown as Record<string, unknown>
      ),
    },
    'Question closed.'
  );
}

/** GET /user/me/community/testimonies */
export async function listMyCommunityTestimonies(
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const userId = new mongoose.Types.ObjectId(requireClientAuth(request));
  const limit = parsePositiveInteger(request.query.limit, 10, 100);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;

  const filter = { submittedBy: userId };
  const [items, total] = await Promise.all([
    Testimony.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Testimony.countDocuments(filter),
  ]);

  sendResponse(
    reply,
    200,
    {
      testimonies: items.map(item =>
        shapeTestimonyDetail(item as unknown as Record<string, unknown>)
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    },
    'Your testimonies loaded.'
  );
}

/** GET /user/me/community/prayer-requests */
export async function listMyCommunityPrayerRequests(
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const userId = new mongoose.Types.ObjectId(requireClientAuth(request));
  const limit = parsePositiveInteger(request.query.limit, 10, 100);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;

  const filter = { submittedBy: userId };
  const [items, total] = await Promise.all([
    PrayerRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PrayerRequest.countDocuments(filter),
  ]);

  sendResponse(
    reply,
    200,
    {
      prayerRequests: items.map(item =>
        shapePrayerRequestDetail(item as unknown as Record<string, unknown>)
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    },
    'Your prayer requests loaded.'
  );
}
