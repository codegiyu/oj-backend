/**
 * Ask-a-pastor public API business logic.
 */

import type { FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parseString, generateUniqueSlug } from '../../utils/helpers';
import { applyTextSearch, parseListQueryParams } from '../../utils/publicListQuery';
import * as askPastorRepo from '../../repositories/community/askPastor.repository';
import * as pastorRepo from '../../repositories/community/pastor.repository';
import { findByIdOrSlug } from '../../repositories/community/shared';
import {
  shapePastorListItem,
  shapePastorDetail,
  shapeQuestionListItem,
  shapeQuestionDetail,
} from '../../controllers/public/community.helpers';
import { AskPastorQuestion } from '../../models/askPastorQuestion';
import { AskPastorQuestionVote } from '../../models/askPastorQuestionVote';
import { AskPastorAnswerLike } from '../../models/askPastorAnswerLike';
import { Pastor } from '../../models/pastor';
import { getAuthUser } from '../../utils/getAuthUser';
import { publicQuestionVisibilityFilter, normalizeQuestionAnswers } from '../pastor.service';
import {
  buildCategoryCounts,
  DEFAULT_NEWEST_SORT,
  pagination,
  resolveExplicitSort,
} from './shared';

export async function listAskAPastorQuestions(
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

  let filter: Record<string, unknown> = {
    ...publicQuestionVisibilityFilter(),
  };
  if (status) filter.status = status;
  if (category && category !== 'all') filter.category = category;

  filter = applyTextSearch(filter, q, ['question', 'author', 'category']);

  const sort = explicitSort
    ? resolveExplicitSort(explicitSort, sortPreset, mongoSort, 'upvotes')
    : DEFAULT_NEWEST_SORT;

  const { items, total } = await askPastorRepo.listAskPastorQuestions({
    filter,
    skip,
    limit,
    sort,
  });

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

export async function getAskAPastorQuestionByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const doc = await askPastorRepo.findAskPastorQuestionByIdOrSlug(request.params.idOrSlug);
  if (!doc) throw new AppError('Question not found', 404);

  if (doc.isPrivate) {
    const auth = getAuthUser(request);
    const submittedByRaw = doc.submittedBy as mongoose.Types.ObjectId | string | null | undefined;
    const submitterId =
      submittedByRaw != null
        ? submittedByRaw instanceof mongoose.Types.ObjectId
          ? submittedByRaw.toString()
          : String(submittedByRaw)
        : null;
    if (!auth?.userId || !submitterId || auth.userId !== submitterId) {
      throw new AppError('Question not found', 404);
    }
  }

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

export async function getAskAPastorPastorByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const doc = await findByIdOrSlug(Pastor, request.params.idOrSlug, {
    profileStatus: 'active',
    isActive: true,
  });
  if (!doc) throw new AppError('Pastor not found', 404);

  return {
    statusCode: 200,
    data: { pastor: shapePastorDetail(doc as unknown as Record<string, unknown>) },
    message: 'Pastor loaded.',
  };
}

export async function listAskAPastorPastors(
  request: FastifyRequest<{ Querystring?: { page?: string; limit?: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const { page, limit, skip } = parseListQueryParams(request.query ?? {});

  const { items, total } = await pastorRepo.listActivePastors({ skip, limit });

  const pastors = items.map(shapePastorListItem);

  return {
    statusCode: 200,
    data: { pastors, pagination: pagination(page, limit, total) },
    message: 'Pastors list loaded.',
  };
}

export async function submitQuestion(
  request: FastifyRequest<{
    Body: {
      name?: string;
      email?: string;
      question: string;
      category?: string;
      isPrivate?: boolean;
      requestedPastorId?: string;
    };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const body = request.body ?? {};
  const auth = getAuthUser(request);
  const baseSlug = body.question.trim().slice(0, 40) || 'question';
  const slug = await generateUniqueSlug(AskPastorQuestion, baseSlug);

  let requestedPastor: mongoose.Types.ObjectId | null = null;
  if (body.requestedPastorId) {
    if (!mongoose.Types.ObjectId.isValid(body.requestedPastorId)) {
      throw new AppError('Invalid requestedPastorId', 400);
    }

    const pastorExists = await Pastor.exists({
      _id: new mongoose.Types.ObjectId(body.requestedPastorId),
      isActive: true,
    });
    if (!pastorExists) throw new AppError('Requested pastor not found', 404);
    requestedPastor = new mongoose.Types.ObjectId(body.requestedPastorId);
  }

  const raw = await askPastorRepo.createAskPastorQuestion({
    question: body.question,
    slug,
    author: (body.name as string)?.trim() || 'Anonymous',
    email: (body.email as string)?.trim() || '',
    category: (body.category as string)?.trim() || '',
    status: 'active',
    isPrivate: !!body.isPrivate,
    requestedPastor,
    submittedBy:
      auth?.userId && mongoose.Types.ObjectId.isValid(auth.userId)
        ? new mongoose.Types.ObjectId(auth.userId)
        : null,
    views: 0,
    helpful: 0,
    upvotes: 0,
    downvotes: 0,
    urgent: false,
    answers: [],
  });

  return {
    statusCode: 201,
    data: { question: shapeQuestionDetail(raw, null) },
    message: 'Question submitted.',
  };
}

export async function voteAskPastorQuestion(
  request: FastifyRequest<{
    Params: { idOrSlug: string };
    Body: { direction: 'up' | 'down' };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const auth = getAuthUser(request);
  if (!auth?.userId) throw new AppError('Authentication required to vote', 401);

  const direction = request.body?.direction;
  if (direction !== 'up' && direction !== 'down') {
    throw new AppError('direction must be up or down', 400);
  }

  const questionDoc = await askPastorRepo.findAskPastorQuestionByIdOrSlug(request.params.idOrSlug);
  if (!questionDoc) throw new AppError('Question not found', 404);
  if (questionDoc.isPrivate) throw new AppError('Question not found', 404);
  if (questionDoc.status === 'closed') throw new AppError('Question is closed', 400);

  const questionId = new mongoose.Types.ObjectId(String(questionDoc._id));
  const voterIdentifier = `user:${auth.userId}`;
  const existingVote = await AskPastorQuestionVote.findOne({
    question: questionId,
    voterIdentifier,
  });

  if (existingVote) {
    if (existingVote.direction === direction) {
      throw new AppError('Already voted', 409);
    }

    const previousField = existingVote.direction === 'up' ? 'upvotes' : 'downvotes';
    const nextField = direction === 'up' ? 'upvotes' : 'downvotes';
    existingVote.direction = direction;
    await existingVote.save();
    await AskPastorQuestion.updateOne(
      { _id: questionId },
      { $inc: { [previousField]: -1, [nextField]: 1 } }
    );
  } else {
    await AskPastorQuestionVote.create({ question: questionId, voterIdentifier, direction });
    await AskPastorQuestion.updateOne(
      { _id: questionId },
      { $inc: { [direction === 'up' ? 'upvotes' : 'downvotes']: 1 } }
    );
  }

  const updated = await AskPastorQuestion.findById(questionId).lean();
  if (!updated) throw new AppError('Question not found', 404);

  return {
    statusCode: 200,
    data: {
      upvotes: updated.upvotes ?? 0,
      downvotes: updated.downvotes ?? 0,
    },
    message: 'Vote recorded.',
  };
}

export async function likeAskPastorAnswer(
  request: FastifyRequest<{ Params: { idOrSlug: string; answerId: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const auth = getAuthUser(request);
  if (!auth?.userId) throw new AppError('Authentication required to like', 401);

  const questionDoc = await askPastorRepo.findAskPastorQuestionByIdOrSlug(request.params.idOrSlug);
  if (!questionDoc) throw new AppError('Question not found', 404);
  if (questionDoc.isPrivate) throw new AppError('Question not found', 404);

  const answers = normalizeQuestionAnswers(questionDoc as never);
  const answerId = request.params.answerId;
  const answerExists = answers.some(entry => String(entry._id) === answerId);
  if (!answerExists) throw new AppError('Answer not found', 404);

  const questionId = new mongoose.Types.ObjectId(String(questionDoc._id));
  const answerObjectId = new mongoose.Types.ObjectId(answerId);
  const voterIdentifier = `user:${auth.userId}`;

  const existingLike = await AskPastorAnswerLike.findOne({
    question: questionId,
    answerId: answerObjectId,
    voterIdentifier,
  });
  if (existingLike) throw new AppError('Already liked', 409);

  await AskPastorAnswerLike.create({
    question: questionId,
    answerId: answerObjectId,
    voterIdentifier,
  });

  await AskPastorQuestion.updateOne(
    { _id: questionId, 'answers._id': answerObjectId },
    { $inc: { 'answers.$.likes': 1 } }
  );

  const updated = await AskPastorQuestion.findById(questionId).lean();
  const updatedAnswers = normalizeQuestionAnswers((updated ?? questionDoc) as never);
  const likedAnswer = updatedAnswers.find(entry => String(entry._id) === answerId);

  return {
    statusCode: 200,
    data: { likes: likedAnswer?.likes ?? 1 },
    message: 'Like recorded.',
  };
}

export async function getAskAPastorHub(): Promise<{
  statusCode: number;
  data: unknown;
  message: string;
}> {
  const activeFilter = { ...publicQuestionVisibilityFilter(), status: 'active' };
  const answeredFilter = { ...publicQuestionVisibilityFilter(), status: 'answered' };

  const [activeResult, answeredResult, pastorsResult] = await Promise.all([
    askPastorRepo.listAskPastorQuestions({ filter: activeFilter, skip: 0, limit: 50 }),
    askPastorRepo.listAskPastorQuestions({ filter: answeredFilter, skip: 0, limit: 20 }),
    pastorRepo.listActivePastors({ skip: 0, limit: 50 }),
  ]);

  const mapQuestion = (raw: Record<string, unknown>) => {
    const pastor = raw.pastor as Record<string, unknown> | null | undefined;
    return shapeQuestionListItem(raw, pastor ?? null);
  };

  const activeQuestions = activeResult.items.map(item =>
    mapQuestion(item as unknown as Record<string, unknown>)
  );
  const answeredQuestions = answeredResult.items.map(item =>
    mapQuestion(item as unknown as Record<string, unknown>)
  );
  const pastors = pastorsResult.items.map(item =>
    shapePastorListItem(item as unknown as Record<string, unknown>)
  );

  const categoryCounts = buildCategoryCounts([...activeQuestions, ...answeredQuestions]);

  return {
    statusCode: 200,
    data: { activeQuestions, answeredQuestions, pastors, categoryCounts },
    message: 'Ask a pastor hub loaded.',
  };
}
