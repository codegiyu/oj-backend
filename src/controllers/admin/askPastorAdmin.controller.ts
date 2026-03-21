import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { AskPastorQuestion } from '../../models/askPastorQuestion';
import { Pastor } from '../../models/pastor';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { parsePositiveInteger, parseSearch, parseString, normalizeSort } from '../../utils/helpers';
import { requireAdmin, parseObjectId } from './admin.helpers';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'question', 'status'];

function toPastorSummary(pastor: { _id: unknown; name?: string; slug?: string; image?: string } | null): Record<string, unknown> | null {
  if (!pastor) return null;
  return {
    _id: pastor._id != null ? String(pastor._id) : pastor._id,
    name: pastor.name,
    slug: pastor.slug,
    image: pastor.image,
  };
}

function shapeAskPastorItem(raw: Record<string, unknown>): Record<string, unknown> {
  const pastor = toPastorSummary(raw.pastor as { _id: unknown; name?: string; slug?: string; image?: string } | null);
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    question: raw.question,
    slug: raw.slug,
    author: raw.author,
    email: raw.email,
    category: raw.category,
    status: raw.status,
    answer: raw.answer,
    pastor,
    answeredAt: raw.answeredAt,
    views: raw.views ?? 0,
    helpful: raw.helpful ?? 0,
    urgent: raw.urgent,
    rejectionReason: raw.rejectionReason,
    rejectedAt: raw.rejectedAt,
    rejectedBy: raw.rejectedBy,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

const PASTOR_POPULATE_SELECT = 'name slug image';

export async function listAdminAskPastor(
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
      { answer: { $regex: search, $options: 'i' } },
      { author: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, '-createdAt');

  const [items, total] = await Promise.all([
    AskPastorQuestion.find(filter).sort(sortStr).populate('pastor', PASTOR_POPULATE_SELECT).skip(skip).limit(limit).lean(),
    AskPastorQuestion.countDocuments(filter),
  ]);

  const questions = (items as Record<string, unknown>[]).map(shapeAskPastorItem);

  sendResponse(reply, 200, {
    questions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  }, 'Ask Pastor questions list loaded.');
}

export async function getAdminAskPastor(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const doc = await AskPastorQuestion.findById(id).populate('pastor', PASTOR_POPULATE_SELECT).lean();
  if (!doc) throw new AppError('Ask Pastor question not found', 404);
  sendResponse(reply, 200, { question: shapeAskPastorItem(doc as unknown as Record<string, unknown>) }, 'Ask Pastor question loaded.');
}

export async function updateAdminAskPastor(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      question?: string;
      author?: string;
      email?: string;
      category?: string;
      answer?: string;
      status?: 'active' | 'answered';
      urgent?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const question = await AskPastorQuestion.findById(id);
  if (!question) throw new AppError('Ask Pastor question not found', 404);

  const body = request.body ?? {};
  if (body.question !== undefined) question.question = body.question;
  if (body.author !== undefined) question.author = body.author;
  if (body.email !== undefined) question.email = body.email;
  if (body.category !== undefined) question.category = body.category;
  if (body.answer !== undefined) question.answer = body.answer;
  if (body.status !== undefined) question.status = body.status;
  if (body.urgent !== undefined) question.urgent = body.urgent;

  await question.save();

  const populated = await AskPastorQuestion.findById(question._id).populate('pastor', PASTOR_POPULATE_SELECT).lean();
  sendResponse(reply, 200, { question: shapeAskPastorItem((populated ?? question.toObject()) as Record<string, unknown>) }, 'Ask Pastor question updated.');
}

export async function deleteAdminAskPastor(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const result = await AskPastorQuestion.findByIdAndDelete(id);
  if (!result) throw new AppError('Ask Pastor question not found', 404);
  sendResponse(reply, 200, { success: true }, 'Ask Pastor question deleted.');
}

export async function assignPastorAdminAskPastor(
  request: FastifyRequest<{ Params: { id: string }; Body: { pastorId: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const pastorId = parseObjectId(request.body?.pastorId, 'pastorId');

  const pastor = await Pastor.findById(pastorId).lean();
  if (!pastor) throw new AppError('Pastor not found', 404);

  const question = await AskPastorQuestion.findById(id);
  if (!question) throw new AppError('Ask Pastor question not found', 404);

  question.pastor = pastorId;
  await question.save();

  const populated = await AskPastorQuestion.findById(question._id).populate('pastor', PASTOR_POPULATE_SELECT).lean();
  sendResponse(reply, 200, { question: shapeAskPastorItem((populated ?? question.toObject()) as Record<string, unknown>) }, 'Pastor assigned.');
}

export async function rejectAdminAskPastor(
  request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const question = await AskPastorQuestion.findById(id);
  if (!question) throw new AppError('Ask Pastor question not found', 404);

  const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';
  question.rejectionReason = reason;
  question.rejectedAt = new Date();
  question.rejectedBy = new mongoose.Types.ObjectId(userId);
  await question.save();

  const populated = await AskPastorQuestion.findById(question._id).populate('pastor', PASTOR_POPULATE_SELECT).lean();
  sendResponse(reply, 200, { question: shapeAskPastorItem((populated ?? question.toObject()) as Record<string, unknown>) }, 'Ask Pastor question rejected.');
}
