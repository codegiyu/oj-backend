/**
 * Polls public API business logic.
 */

import type { FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parseString, generateUniqueSlug } from '../../utils/helpers';
import { applyTextSearch, parseListQueryParams } from '../../utils/publicListQuery';
import { normalizePollOptionTexts } from '../../utils/pollOptions';
import * as pollRepo from '../../repositories/community/poll.repository';
import { shapePollListItem, shapePollDetail } from '../../controllers/public/community.helpers';
import { Poll } from '../../models/poll';
import { getAuthUser } from '../../utils/getAuthUser';
import { DEFAULT_NEWEST_SORT, pagination, resolveExplicitSort } from './shared';

export async function listPolls(
  request: FastifyRequest<{
    Querystring: { status?: string; page?: string; limit?: string; q?: string; sort?: string };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const { page, limit, skip, q, sortPreset, mongoSort } = parseListQueryParams(request.query);
  const status = parseString(request.query?.status);
  const explicitSort = parseString(request.query?.sort);

  let filter: Record<string, unknown> = {};

  if (status === 'all') {
    filter.status = { $in: ['active', 'closed'] };
  } else if (status) {
    filter.status = status;
  } else {
    filter.status = 'active';
  }

  filter = applyTextSearch(filter, q, ['question', 'description', 'category']);

  const sort = explicitSort
    ? resolveExplicitSort(explicitSort, sortPreset, mongoSort, 'totalVotes')
    : DEFAULT_NEWEST_SORT;

  const { items, total } = await pollRepo.listPolls({ filter, skip, limit, sort });

  const polls = items.map(shapePollListItem);

  return {
    statusCode: 200,
    data: { polls, pagination: pagination(page, limit, total) },
    message: 'Polls list loaded.',
  };
}

export async function getPollByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const doc = await pollRepo.findPollByIdOrSlug(request.params.idOrSlug);
  if (!doc) throw new AppError('Poll not found', 404);

  const pollStatus = typeof doc.status === 'string' ? doc.status : '';
  if (pollStatus === 'pending' || pollStatus === 'rejected') {
    const auth = getAuthUser(request);
    const submittedBy = doc.submittedBy;
    const ownerId =
      submittedBy != null && typeof submittedBy === 'object' && '_id' in submittedBy
        ? String((submittedBy as { _id: unknown })._id)
        : typeof submittedBy === 'string'
          ? submittedBy
          : '';
    if (!auth?.userId || ownerId !== String(auth.userId)) {
      throw new AppError('Poll not found', 404);
    }
  }

  return { statusCode: 200, data: { poll: shapePollDetail(doc) }, message: 'Poll loaded.' };
}

export async function createPoll(
  request: FastifyRequest<{
    Body: { question: string; description?: string; category?: string; options: string[] };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const auth = getAuthUser(request);
  if (!auth?.userId) throw new AppError('Authentication required to create a poll', 401);

  const body = request.body ?? {};
  const slug = await generateUniqueSlug(Poll, body.question.trim().slice(0, 40) || 'poll');
  const optionTexts = normalizePollOptionTexts(body.options ?? []);

  const options = optionTexts.map(text => ({
    _id: new mongoose.Types.ObjectId(),
    text,
    votes: 0,
  }));

  const submittedBy =
    auth.userId && mongoose.Types.ObjectId.isValid(auth.userId)
      ? new mongoose.Types.ObjectId(auth.userId)
      : null;

  const raw = await pollRepo.createPoll({
    question: body.question,
    slug,
    description: (body.description as string)?.trim() || '',
    category: (body.category as string)?.trim() || '',
    options,
    status: 'pending',
    submittedBy,
    totalVotes: 0,
  });

  return {
    statusCode: 201,
    data: { poll: shapePollDetail(raw) },
    message: 'Poll submitted for review.',
  };
}

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
