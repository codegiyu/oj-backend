import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Poll } from '../../models/poll';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug } from '../../utils/helpers';
import { leanIdToString, requireAdmin, parseObjectId } from './admin.helpers';
import { runAdminList, runAdminGet } from '../../services/admin/runAdminListGet';
import { listAdminPollRows, findAdminPollById } from '../../repositories/admin/poll.repository';

function shapePollItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    question: raw.question,
    slug: raw.slug,
    description: raw.description,
    category: raw.category,
    options: raw.options,
    status: raw.status,
    startDate: raw.startDate,
    endDate: raw.endDate,
    totalVotes: raw.totalVotes ?? 0,
    closedReason: raw.closedReason,
    closedBy: raw.closedBy,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

export async function listAdminPolls(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string; status?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: ['createdAt', 'updatedAt', 'question', 'status'],
    searchFields: ['question', 'description'],
    listRows: listAdminPollRows,
    shapeItem: shapePollItem,
    collectionKey: 'polls',
    message: 'Polls list loaded.',
  });
  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminPoll(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminGet(request, {
    findById: findAdminPollById,
    shapeItem: shapePollItem,
    itemKey: 'poll',
    message: 'Poll loaded.',
    notFoundMessage: 'Poll not found',
  });
  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function createAdminPoll(
  request: FastifyRequest<{
    Body: {
      question: string;
      description?: string;
      category?: string;
      options: { text: string }[];
      status?: 'active' | 'closed';
      startDate?: string | Date;
      endDate?: string | Date;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body;
  if (!body?.question || typeof body.question !== 'string' || !body.question.trim()) {
    throw new AppError('Question is required', 400);
  }
  if (!Array.isArray(body.options) || body.options.length < 2) {
    throw new AppError('At least 2 options are required', 400);
  }

  const options = body.options
    .map((opt: { text?: string }) => ({
      text: typeof opt?.text === 'string' ? opt.text.trim() : 'Option',
      votes: 0,
    }))
    .filter(opt => opt.text.length > 0);
  if (options.length < 2) throw new AppError('At least 2 valid options are required', 400);

  const slug = await generateUniqueSlug(Poll, body.question.trim());

  const poll = await Poll.create({
    question: body.question.trim(),
    slug,
    description: body.description ?? '',
    category: body.category ?? '',
    options,
    status: body.status ?? 'active',
    startDate: body.startDate ? new Date(body.startDate) : new Date(),
    endDate: body.endDate ? new Date(body.endDate) : undefined,
  });

  const populated = await Poll.findById(poll._id).lean();
  sendResponse(
    reply,
    201,
    { poll: shapePollItem((populated ?? poll) as unknown as Record<string, unknown>) },
    'Poll created.'
  );
}

export async function updateAdminPoll(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      question?: string;
      description?: string;
      category?: string;
      options?: { text: string; votes?: number }[];
      status?: 'active' | 'closed';
      startDate?: string | Date;
      endDate?: string | Date;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const poll = await Poll.findById(id);
  if (!poll) throw new AppError('Poll not found', 404);

  const body = request.body ?? {};
  if (body.question !== undefined) poll.question = body.question;
  if (body.description !== undefined) poll.description = body.description;
  if (body.category !== undefined) poll.category = body.category;
  if (body.options !== undefined && Array.isArray(body.options) && body.options.length >= 2) {
    poll.options = body.options.map((opt: { text?: string; votes?: number }) => ({
      _id: new mongoose.Types.ObjectId(),
      text: typeof opt?.text === 'string' ? opt.text.trim() : 'Option',
      votes: typeof opt?.votes === 'number' ? opt.votes : 0,
    }));
  }
  if (body.status !== undefined) poll.status = body.status;
  if (body.startDate !== undefined)
    poll.startDate = body.startDate ? new Date(body.startDate) : poll.startDate;
  if (body.endDate !== undefined) poll.endDate = body.endDate ? new Date(body.endDate) : undefined;

  await poll.save();

  const populated = await Poll.findById(poll._id).lean();
  sendResponse(
    reply,
    200,
    { poll: shapePollItem((populated ?? poll.toObject()) as unknown as Record<string, unknown>) },
    'Poll updated.'
  );
}

export async function deleteAdminPoll(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const result = await Poll.findByIdAndDelete(id);
  if (!result) throw new AppError('Poll not found', 404);
  sendResponse(reply, 200, { success: true }, 'Poll deleted.');
}

export async function openAdminPoll(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const poll = await Poll.findById(id);
  if (!poll) throw new AppError('Poll not found', 404);

  poll.status = 'active';
  poll.closedReason = '';
  poll.closedBy = null;
  poll.endDate = undefined;
  await poll.save();

  const populated = await Poll.findById(poll._id).lean();
  sendResponse(
    reply,
    200,
    { poll: shapePollItem((populated ?? poll.toObject()) as unknown as Record<string, unknown>) },
    'Poll opened.'
  );
}

export async function closeAdminPoll(
  request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const poll = await Poll.findById(id);
  if (!poll) throw new AppError('Poll not found', 404);

  const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';
  poll.status = 'closed';
  poll.closedReason = reason;
  poll.closedBy = new mongoose.Types.ObjectId(userId);
  poll.endDate = new Date();
  await poll.save();

  const populated = await Poll.findById(poll._id).lean();
  sendResponse(
    reply,
    200,
    { poll: shapePollItem((populated ?? poll.toObject()) as unknown as Record<string, unknown>) },
    'Poll closed.'
  );
}
