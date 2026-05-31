import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Pastor } from '../../models/pastor';
import { PastorApplication } from '../../models/pastorApplication';
import { AskPastorQuestion } from '../../models/askPastorQuestion';
import { User } from '../../models/user';
import type { IPastor, IUser, IAskPastorQuestion } from '../../lib/types/constants';
import { AppError } from '../../utils/AppError';
import { getAuthUser } from '../../utils/getAuthUser';
import { sendResponse } from '../../utils/response';
import { parsePositiveInteger, parseSearch, parseString, normalizeSort } from '../../utils/helpers';
import {
  buildPastorDashboardStats,
  incrementPastorQuestionsAnswered,
  pastorQuestionAccessFilter,
} from '../../services/pastor.service';
import {
  computePastorApplicationCooldown,
  shapePastorApplicationCooldownFields,
} from '../../utils/pastorApplicationCooldown';
import {
  serializePastorDoc,
  shapePastorQuestionDetail,
  shapePastorQuestionListItem,
} from './pastor.helpers';

const QUESTION_SORT_FIELDS = ['createdAt', 'updatedAt', 'status'];

/** Returns pastor or throws 403 (no pastor link) / 404 (pastor record missing). */
export async function getPastorForUser(userId: string): Promise<IPastor> {
  const user = await User.findById(userId)
    .select('pastorId')
    .lean<Pick<IUser, 'pastorId'> | null>();
  if (!user?.pastorId) {
    throw new AppError('You do not have an associated pastor profile', 403);
  }

  const pastor = await Pastor.findById(user.pastorId).lean<IPastor | null>();
  if (!pastor) {
    throw new AppError('Pastor profile not found', 404);
  }

  return pastor;
}

function shapeApplicationResponse(application: Record<string, unknown>): Record<string, unknown> {
  const cooldown = shapePastorApplicationCooldownFields(application as never);

  return {
    _id: application._id,
    status: application.status,
    name: application.name,
    title: application.title,
    church: application.church,
    bio: application.bio,
    image: application.image,
    expertise: application.expertise ?? [],
    motivation: application.motivation,
    rejectionReason: application.rejectionReason,
    rejectedAt: application.rejectedAt,
    reviewedAt: application.reviewedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    ...cooldown,
  };
}

/** GET /pastor/me — portal state: active pastor profile, pending/rejected application, or none. */
export async function getPastorMe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const user = await User.findById(auth.userId)
    .select('pastorId')
    .lean<Pick<IUser, 'pastorId'> | null>();
  if (!user) throw new AppError('User not found', 404);

  if (user.pastorId) {
    const pastor = await Pastor.findById(user.pastorId).lean<IPastor | null>();
    if (!pastor) throw new AppError('Pastor profile not found', 404);

    sendResponse(
      reply,
      200,
      {
        portalState: 'active',
        pastor: serializePastorDoc(pastor as unknown as Record<string, unknown>),
        application: null,
      },
      'Pastor portal loaded.'
    );
    return;
  }

  const application = await PastorApplication.findOne({ user: auth.userId }).lean();
  if (!application) {
    sendResponse(
      reply,
      200,
      { portalState: 'none', pastor: null, application: null },
      'Pastor portal loaded.'
    );
    return;
  }

  sendResponse(
    reply,
    200,
    {
      portalState:
        application.status === 'pending'
          ? 'pending'
          : application.status === 'rejected'
            ? 'rejected'
            : 'none',
      pastor: null,
      application: shapeApplicationResponse(application as unknown as Record<string, unknown>),
    },
    'Pastor portal loaded.'
  );
}

/** POST /pastor/application — submit pastor application for admin review. */
export async function submitPastorApplication(
  request: FastifyRequest<{
    Body: {
      name: string;
      title?: string;
      church?: string;
      bio?: string;
      image?: string;
      expertise?: string[];
      motivation?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  if (!mongoose.Types.ObjectId.isValid(auth.userId)) {
    throw new AppError('Invalid user id', 400);
  }

  const userId = new mongoose.Types.ObjectId(auth.userId);
  const body = request.body ?? {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw new AppError('Name is required', 400);

  const user = await User.findById(userId)
    .select('pastorId')
    .lean<Pick<IUser, 'pastorId'> | null>();
  if (!user) throw new AppError('User not found', 404);
  if (user.pastorId) throw new AppError('You already have a pastor profile', 409);

  const existing = await PastorApplication.findOne({ user: userId });
  if (existing) {
    if (existing.status === 'pending') {
      throw new AppError('You already have a pending pastor application', 409);
    }

    if (existing.status === 'approved') {
      throw new AppError('Your pastor application was already approved', 409);
    }

    const cooldown = computePastorApplicationCooldown(existing.rejectedAt);
    if (!cooldown.canReapply) {
      throw new AppError(
        `You may reapply after ${cooldown.reapplyAvailableAt ?? 'the cooldown period'}`,
        429
      );
    }

    existing.status = 'pending';
    existing.name = name;
    existing.title = body.title ?? '';
    existing.church = body.church ?? '';
    existing.bio = body.bio ?? '';
    existing.image = body.image ?? '';
    existing.expertise = Array.isArray(body.expertise) ? body.expertise : [];
    existing.motivation = body.motivation ?? '';
    existing.rejectionReason = '';
    existing.rejectedAt = null;
    existing.reviewedAt = null;
    existing.reviewedBy = null;
    await existing.save();

    sendResponse(
      reply,
      200,
      {
        application: shapeApplicationResponse(
          existing.toObject() as unknown as Record<string, unknown>
        ),
      },
      'Pastor application submitted.'
    );
    return;
  }

  const application = await PastorApplication.create({
    user: userId,
    status: 'pending',
    name,
    title: body.title ?? '',
    church: body.church ?? '',
    bio: body.bio ?? '',
    image: body.image ?? '',
    expertise: Array.isArray(body.expertise) ? body.expertise : [],
    motivation: body.motivation ?? '',
  });

  sendResponse(
    reply,
    201,
    {
      application: shapeApplicationResponse(
        application.toObject() as unknown as Record<string, unknown>
      ),
    },
    'Pastor application submitted.'
  );
}

/** GET /pastor/me/profile */
export async function getPastorProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const pastor = await getPastorForUser(auth.userId);
  sendResponse(
    reply,
    200,
    { pastor: serializePastorDoc(pastor as unknown as Record<string, unknown>) },
    'Pastor profile loaded.'
  );
}

/** PATCH /pastor/me/profile */
export async function updatePastorProfile(
  request: FastifyRequest<{
    Body: {
      name?: string;
      title?: string;
      church?: string;
      bio?: string;
      image?: string;
      expertise?: string[];
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const pastorLean = await getPastorForUser(auth.userId);
  const pastorDoc = await Pastor.findById(pastorLean._id);
  if (!pastorDoc) throw new AppError('Pastor profile not found', 404);

  const body = request.body ?? {};
  if (body.name !== undefined) pastorDoc.name = body.name;
  if (body.title !== undefined) pastorDoc.title = body.title;
  if (body.church !== undefined) pastorDoc.church = body.church;
  if (body.bio !== undefined) pastorDoc.bio = body.bio;
  if (body.image !== undefined) pastorDoc.image = body.image;
  if (body.expertise !== undefined) {
    pastorDoc.expertise = Array.isArray(body.expertise) ? body.expertise : pastorDoc.expertise;
  }

  await pastorDoc.save();
  sendResponse(
    reply,
    200,
    { pastor: serializePastorDoc(pastorDoc.toObject() as unknown as Record<string, unknown>) },
    'Pastor profile updated.'
  );
}

/** GET /pastor/dashboard-stats */
export async function getPastorDashboardStats(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const pastor = await getPastorForUser(auth.userId);
  const stats = await buildPastorDashboardStats(pastor._id);

  sendResponse(reply, 200, stats, 'Pastor dashboard stats loaded.');
}

/** GET /pastor/questions */
export async function listPastorQuestions(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; status?: string; search?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const pastor = await getPastorForUser(auth.userId);
  const pastorId = pastor._id;

  const limit = parsePositiveInteger(request.query.limit, 10, 100);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(request.query.search);
  const status = parseString(request.query.status);
  const sortStr = normalizeSort(request.query.sort, QUESTION_SORT_FIELDS, '-createdAt');

  const filter: Record<string, unknown> = {
    ...pastorQuestionAccessFilter(pastorId),
  };
  if (status) filter.status = status;
  if (search) {
    const searchClause = {
      $or: [
        { question: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ],
    };
    const existingAnd = Array.isArray(filter.$and)
      ? (filter.$and as Record<string, unknown>[])
      : [];
    filter.$and = [...existingAnd, searchClause];
  }

  const [items, total] = await Promise.all([
    AskPastorQuestion.find(filter)
      .sort(sortStr)
      .populate('requestedPastor', 'name slug image title church')
      .populate('pastor', 'name slug image title church')
      .skip(skip)
      .limit(limit)
      .lean(),
    AskPastorQuestion.countDocuments(filter),
  ]);

  const questions = items.map(item =>
    shapePastorQuestionListItem(item as unknown as Record<string, unknown>)
  );

  sendResponse(
    reply,
    200,
    {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
      questions,
    },
    'Pastor questions list loaded.'
  );
}

/** GET /pastor/questions/:id */
export async function getPastorQuestion(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const pastor = await getPastorForUser(auth.userId);
  if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
    throw new AppError('Invalid id', 400);
  }

  const questionId = new mongoose.Types.ObjectId(request.params.id);
  const doc = await AskPastorQuestion.findOne({
    _id: questionId,
    ...pastorQuestionAccessFilter(pastor._id),
  })
    .populate('requestedPastor')
    .populate('pastor')
    .populate('answers.pastor', 'name slug image title church')
    .lean<IAskPastorQuestion | null>();

  if (!doc) throw new AppError('Question not found', 404);

  sendResponse(
    reply,
    200,
    { question: shapePastorQuestionDetail(doc as unknown as Record<string, unknown>) },
    'Question loaded.'
  );
}

/** POST /pastor/questions/:id/answers */
export async function answerPastorQuestion(
  request: FastifyRequest<{ Params: { id: string }; Body: { answer: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const pastor = await getPastorForUser(auth.userId);
  if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
    throw new AppError('Invalid id', 400);
  }

  const answerText = typeof request.body?.answer === 'string' ? request.body.answer.trim() : '';
  if (!answerText) throw new AppError('Answer is required', 400);

  const questionId = new mongoose.Types.ObjectId(request.params.id);
  const question = await AskPastorQuestion.findOne({
    _id: questionId,
    status: { $in: ['active', 'answered'] },
    ...pastorQuestionAccessFilter(pastor._id),
  });

  if (!question) throw new AppError('Question not found or not available for answering', 404);

  if (
    question.isPrivate &&
    question.requestedPastor &&
    String(question.requestedPastor) !== String(pastor._id)
  ) {
    throw new AppError('This private question is assigned to another pastor', 403);
  }

  const alreadyAnswered = (question.answers ?? []).some(
    entry => String(entry.pastor) === String(pastor._id)
  );
  if (alreadyAnswered) {
    throw new AppError('You have already answered this question', 409);
  }

  question.answers = question.answers ?? [];
  question.answers.push({
    _id: new mongoose.Types.ObjectId(),
    pastor: pastor._id,
    answer: answerText,
    answeredAt: new Date(),
    likes: 0,
  });

  question.status = 'answered';
  question.answeredAt = new Date();
  await question.save();
  await incrementPastorQuestionsAnswered(pastor._id);

  const populated = await AskPastorQuestion.findById(question._id)
    .populate('requestedPastor')
    .populate('pastor')
    .populate('answers.pastor', 'name slug image title church')
    .lean();

  sendResponse(
    reply,
    201,
    {
      question: shapePastorQuestionDetail(
        (populated ?? question.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Answer submitted.'
  );
}
