import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Poll } from '../../models/poll';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug, parsePositiveInteger, parseSearch, parseString, normalizeSort } from '../../utils/helpers';
import { requireAdmin, parseObjectId } from './admin.helpers';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'question', 'status'];

function shapePollItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
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
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string; search?: string; status?: string; sort?: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const limit = parsePositiveInteger(request.query.limit, 25, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  const search = parseSearch(request.query.search);
  const status = parseString(request.query.status);
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { question: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, '-createdAt');

  const [items, total] = await Promise.all([
    Poll.find(filter).sort(sortStr).skip(skip).limit(limit).lean(),
    Poll.countDocuments(filter),
  ]);

  const polls = (items as Record<string, unknown>[]).map(shapePollItem);

  sendResponse(reply, 200, {
    polls,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  }, 'Polls list loaded.');
}

export async function getAdminPoll(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const doc = await Poll.findById(id).lean();
  if (!doc) throw new AppError('Poll not found', 404);
  sendResponse(reply, 200, { poll: shapePollItem(doc as unknown as Record<string, unknown>) }, 'Poll loaded.');
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
  requireAdmin(request);
  const body = request.body;
  if (!body?.question || typeof body.question !== 'string' || !body.question.trim()) {
    throw new AppError('Question is required', 400);
  }
  if (!Array.isArray(body.options) || body.options.length < 2) {
    throw new AppError('At least 2 options are required', 400);
  }

  const options = body.options.map((opt: { text?: string }) => ({
    text: typeof opt?.text === 'string' ? opt.text.trim() : 'Option',
    votes: 0,
  })).filter(opt => opt.text.length > 0);
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
    endDate: body.endDate ? new Date(body.endDate) : null,
  });

  const populated = await Poll.findById(poll._id).lean();
  sendResponse(reply, 201, { poll: shapePollItem((populated ?? poll) as unknown as Record<string, unknown>) }, 'Poll created.');
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
  requireAdmin(request);
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
  if (body.startDate !== undefined) poll.startDate = body.startDate ? new Date(body.startDate) : poll.startDate;
  if (body.endDate !== undefined) poll.endDate = body.endDate ? new Date(body.endDate) : null;

  await poll.save();

  const populated = await Poll.findById(poll._id).lean();
  sendResponse(reply, 200, { poll: shapePollItem((populated ?? poll.toObject()) as Record<string, unknown>) }, 'Poll updated.');
}

export async function deleteAdminPoll(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const result = await Poll.findByIdAndDelete(id);
  if (!result) throw new AppError('Poll not found', 404);
  sendResponse(reply, 200, { success: true }, 'Poll deleted.');
}

export async function openAdminPoll(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const poll = await Poll.findById(id);
  if (!poll) throw new AppError('Poll not found', 404);

  poll.status = 'active';
  poll.closedReason = '';
  poll.closedBy = null;
  poll.endDate = null;
  await poll.save();

  const populated = await Poll.findById(poll._id).lean();
  sendResponse(reply, 200, { poll: shapePollItem((populated ?? poll.toObject()) as Record<string, unknown>) }, 'Poll opened.');
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
  sendResponse(reply, 200, { poll: shapePollItem((populated ?? poll.toObject()) as Record<string, unknown>) }, 'Poll closed.');
}
