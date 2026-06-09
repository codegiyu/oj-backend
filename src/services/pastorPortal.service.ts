import mongoose from 'mongoose';
import type { IPastor } from '../lib/types/constants';
import { AppError } from '../utils/AppError';
import { parsePositiveInteger, parseSearch, parseString, normalizeSort } from '../utils/helpers';
import {
  buildPastorDashboardStats,
  incrementPastorQuestionsAnswered,
  pastorQuestionAccessFilter,
} from './pastor.service';
import {
  computePastorApplicationCooldown,
  shapePastorApplicationCooldownFields,
} from '../utils/pastorApplicationCooldown';
import {
  serializePastorDoc,
  shapePastorQuestionDetail,
  shapePastorQuestionListItem,
} from '../controllers/pastor/pastor.helpers';
import {
  assertOwnerUserNotSuspended,
  deactivateRoleProfile,
  reactivateRoleProfile,
  createRoleProfileAppeal,
  loadAppealSummariesForProfile,
  shapeRolePortalMeta,
} from './roleProfileLifecycle.service';
import { isArtistOrPastorRoleActive } from './profileVisibility';
import { parseObjectId } from '../controllers/admin/admin.helpers';
import * as pastorRepo from '../repositories/pastor/pastor.repository';

const QUESTION_SORT_FIELDS = ['createdAt', 'updatedAt', 'status'];

function pastorPortalStateFromProfile(pastor: IPastor): string {
  const status = pastor.profileStatus ?? (pastor.isActive === false ? 'suspended' : 'active');
  if (status === 'active') return 'active';

  return status;
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

/** Returns pastor or throws 403 (no pastor link) / 404 (pastor record missing). */
export async function getPastorForUser(userId: string): Promise<IPastor> {
  const user = await pastorRepo.findUserPastorId(userId);

  if (!user?.pastorId) {
    throw new AppError('You do not have an associated pastor profile', 403);
  }

  const pastor = await pastorRepo.findPastorLeanById(user.pastorId);

  if (!pastor) {
    throw new AppError('Pastor profile not found', 404);
  }

  return pastor;
}

async function getPastorForUserOperational(userId: string): Promise<IPastor> {
  await assertOwnerUserNotSuspended(userId);
  const pastor = await getPastorForUser(userId);

  if (!isArtistOrPastorRoleActive(pastor)) {
    const status = pastor.profileStatus ?? (pastor.isActive === false ? 'suspended' : 'active');
    const message =
      status === 'deactivated'
        ? 'Your pastor profile is deactivated'
        : 'Your pastor profile has been suspended';
    throw new AppError(message, 403);
  }

  return pastor;
}

export async function loadPastorMe(userId: string): Promise<Record<string, unknown>> {
  const user = await pastorRepo.findUserPastorId(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.pastorId) {
    const pastor = await pastorRepo.findPastorLeanById(user.pastorId);

    if (!pastor) {
      throw new AppError('Pastor profile not found', 404);
    }

    const appeals = await loadAppealSummariesForProfile('pastor', pastor._id);
    const serialized = serializePastorDoc(pastor as unknown as Record<string, unknown>);
    const portalState = pastorPortalStateFromProfile(pastor);
    const meta = shapeRolePortalMeta('pastor', serialized, appeals);

    return {
      portalState,
      pastor: serialized,
      application: null,
      ...meta,
    };
  }

  const application = await pastorRepo.findPastorApplicationByUserId(userId);

  if (!application) {
    return { portalState: 'none', pastor: null, application: null };
  }

  return {
    portalState:
      application.status === 'pending'
        ? 'pending'
        : application.status === 'rejected'
          ? 'rejected'
          : 'none',
    pastor: null,
    application: shapeApplicationResponse(application as unknown as Record<string, unknown>),
  };
}

export async function deactivatePastorProfile(userId: string): Promise<void> {
  const pastor = await getPastorForUser(userId);

  await deactivateRoleProfile({
    profileType: 'pastor',
    profileId: pastor._id,
    userId: parseObjectId(userId, 'userId'),
  });
}

export async function reactivatePastorProfile(userId: string): Promise<void> {
  const pastor = await getPastorForUser(userId);

  await reactivateRoleProfile({
    profileType: 'pastor',
    profileId: pastor._id,
    userId: parseObjectId(userId, 'userId'),
  });
}

export async function submitPastorProfileAppeal(
  userId: string,
  message: string
): Promise<Record<string, unknown>> {
  const pastor = await getPastorForUser(userId);

  const appeal = await createRoleProfileAppeal({
    profileType: 'pastor',
    profileId: pastor._id,
    userId: parseObjectId(userId, 'userId'),
    message,
  });

  return { appeal };
}

export async function submitPastorApplication(
  userId: string,
  body: {
    name: string;
    title?: string;
    church?: string;
    bio?: string;
    image?: string;
    expertise?: string[];
    motivation?: string;
  }
): Promise<{ statusCode: number; data: Record<string, unknown>; message: string }> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user id', 400);
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!name) {
    throw new AppError('Name is required', 400);
  }

  const user = await pastorRepo.findUserPastorId(userObjectId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.pastorId) {
    throw new AppError('You already have a pastor profile', 409);
  }

  const existing = await pastorRepo.findPastorApplicationDocumentByUserId(userObjectId);

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

    return {
      statusCode: 200,
      data: {
        application: shapeApplicationResponse(
          existing.toObject() as unknown as Record<string, unknown>
        ),
      },
      message: 'Pastor application submitted.',
    };
  }

  const application = await pastorRepo.createPastorApplication({
    user: userObjectId,
    status: 'pending',
    name,
    title: body.title ?? '',
    church: body.church ?? '',
    bio: body.bio ?? '',
    image: body.image ?? '',
    expertise: Array.isArray(body.expertise) ? body.expertise : [],
    motivation: body.motivation ?? '',
  });

  return {
    statusCode: 201,
    data: {
      application: shapeApplicationResponse(
        application.toObject() as unknown as Record<string, unknown>
      ),
    },
    message: 'Pastor application submitted.',
  };
}

export async function loadPastorProfile(userId: string): Promise<Record<string, unknown>> {
  const pastor = await getPastorForUserOperational(userId);

  return { pastor: serializePastorDoc(pastor as unknown as Record<string, unknown>) };
}

export async function updatePastorProfile(
  userId: string,
  body: {
    name?: string;
    title?: string;
    church?: string;
    bio?: string;
    image?: string;
    expertise?: string[];
  }
): Promise<Record<string, unknown>> {
  const pastorLean = await getPastorForUser(userId);
  const pastorDoc = await pastorRepo.findPastorDocumentById(pastorLean._id);

  if (!pastorDoc) {
    throw new AppError('Pastor profile not found', 404);
  }

  if (body.name !== undefined) pastorDoc.name = body.name;
  if (body.title !== undefined) pastorDoc.title = body.title;
  if (body.church !== undefined) pastorDoc.church = body.church;
  if (body.bio !== undefined) pastorDoc.bio = body.bio;
  if (body.image !== undefined) pastorDoc.image = body.image;
  if (body.expertise !== undefined) {
    pastorDoc.expertise = Array.isArray(body.expertise) ? body.expertise : pastorDoc.expertise;
  }

  await pastorDoc.save();

  return { pastor: serializePastorDoc(pastorDoc.toObject() as unknown as Record<string, unknown>) };
}

export async function loadPastorDashboardStats(userId: string): Promise<Record<string, unknown>> {
  const pastor = await getPastorForUserOperational(userId);

  return buildPastorDashboardStats(pastor._id);
}

export async function listPastorQuestions(
  userId: string,
  query: { page?: string; limit?: string; status?: string; search?: string; sort?: string }
): Promise<Record<string, unknown>> {
  const pastor = await getPastorForUserOperational(userId);
  const pastorId = pastor._id;

  const limit = parsePositiveInteger(query.limit, 10, 100);
  const page = parsePositiveInteger(query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(query.search);
  const status = parseString(query.status);
  const sortStr = normalizeSort(query.sort, QUESTION_SORT_FIELDS, '-createdAt');

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
    pastorRepo.listPastorPortalQuestions({ filter, sort: sortStr, skip, limit }),
    pastorRepo.countPastorPortalQuestions(filter),
  ]);

  const questions = items.map(item =>
    shapePastorQuestionListItem(item as unknown as Record<string, unknown>)
  );

  return {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    questions,
  };
}

export async function loadPastorQuestion(
  userId: string,
  questionIdRaw: string
): Promise<Record<string, unknown>> {
  const pastor = await getPastorForUserOperational(userId);

  if (!mongoose.Types.ObjectId.isValid(questionIdRaw)) {
    throw new AppError('Invalid id', 400);
  }

  const questionId = new mongoose.Types.ObjectId(questionIdRaw);
  const doc = await pastorRepo.findPastorPortalQuestionById({
    questionId,
    accessFilter: pastorQuestionAccessFilter(pastor._id),
  });

  if (!doc) {
    throw new AppError('Question not found', 404);
  }

  return { question: shapePastorQuestionDetail(doc as unknown as Record<string, unknown>) };
}

export async function answerPastorQuestion(
  userId: string,
  questionIdRaw: string,
  answerTextRaw: string
): Promise<Record<string, unknown>> {
  const pastor = await getPastorForUserOperational(userId);

  if (!mongoose.Types.ObjectId.isValid(questionIdRaw)) {
    throw new AppError('Invalid id', 400);
  }

  const answerText = typeof answerTextRaw === 'string' ? answerTextRaw.trim() : '';

  if (!answerText) {
    throw new AppError('Answer is required', 400);
  }

  const questionId = new mongoose.Types.ObjectId(questionIdRaw);
  const question = await pastorRepo.findPastorPortalQuestionDocumentForAnswer({
    questionId,
    accessFilter: pastorQuestionAccessFilter(pastor._id),
  });

  if (!question) {
    throw new AppError('Question not found or not available for answering', 404);
  }

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

  const populated = await pastorRepo.findPastorQuestionPopulatedById(question._id);

  return {
    question: shapePastorQuestionDetail(
      (populated ?? question.toObject()) as unknown as Record<string, unknown>
    ),
  };
}
