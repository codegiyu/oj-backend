import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { AskPastorQuestion } from '../../models/askPastorQuestion';
import { Pastor } from '../../models/pastor';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { leanIdToString, requireAdmin, parseObjectId } from './admin.helpers';
import { runAdminList, runAdminGet } from '../../services/admin/runAdminListGet';
import {
  listAdminAskPastorRows,
  findAdminAskPastorById,
} from '../../repositories/admin/askPastor.repository';
import {
  applyCategoryOnlyExtendFilters,
  type ContentListQuery,
} from '../../services/admin/adminListFilters';
import { shapeAdminPrivateQuestionMetadata } from '../pastor/pastor.helpers';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'question', 'status'];

function toPastorSummary(
  pastor: { _id: unknown; name?: string; slug?: string; image?: string } | null
): Record<string, unknown> | null {
  if (!pastor) return null;
  return {
    _id: pastor._id != null ? leanIdToString(pastor._id) : pastor._id,
    name: pastor.name,
    slug: pastor.slug,
    image: pastor.image,
  };
}

function shapeAskPastorItem(raw: Record<string, unknown>): Record<string, unknown> {
  const redacted = shapeAdminPrivateQuestionMetadata(raw);
  const pastor = toPastorSummary(
    redacted.pastor as { _id: unknown; name?: string; slug?: string; image?: string } | null
  );
  return {
    _id: redacted._id != null ? leanIdToString(redacted._id) : redacted._id,
    question: redacted.question,
    slug: redacted.slug,
    author: redacted.author,
    email: redacted.email,
    category: redacted.category,
    status: redacted.status,
    isPrivate: !!redacted.isPrivate,
    answer: redacted.answer,
    pastor,
    answeredAt: redacted.answeredAt,
    views: redacted.views ?? 0,
    helpful: redacted.helpful ?? 0,
    upvotes: redacted.upvotes ?? 0,
    downvotes: redacted.downvotes ?? 0,
    urgent: redacted.urgent,
    rejectionReason: redacted.rejectionReason,
    rejectedAt: redacted.rejectedAt,
    rejectedBy: redacted.rejectedBy,
    createdAt:
      redacted.createdAt instanceof Date ? redacted.createdAt.toISOString() : redacted.createdAt,
    updatedAt:
      redacted.updatedAt instanceof Date ? redacted.updatedAt.toISOString() : redacted.updatedAt,
  };
}

const PASTOR_POPULATE_SELECT = 'name slug image';

export async function listAdminAskPastor(
  request: FastifyRequest<{ Querystring: ContentListQuery }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: SORT_FIELDS,
    searchFields: ['question', 'answer', 'author', 'slug'],
    extendFilter: applyCategoryOnlyExtendFilters,
    listRows: listAdminAskPastorRows,
    shapeItem: shapeAskPastorItem,
    collectionKey: 'questions',
    message: 'Ask Pastor questions list loaded.',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminAskPastor(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminGet(request, {
    findById: findAdminAskPastorById,
    shapeItem: shapeAskPastorItem,
    itemKey: 'question',
    message: 'Ask Pastor question loaded.',
    notFoundMessage: 'Ask Pastor question not found',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
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

  const populated = await AskPastorQuestion.findById(question._id)
    .populate('pastor', PASTOR_POPULATE_SELECT)
    .lean();
  sendResponse(
    reply,
    200,
    {
      question: shapeAskPastorItem(
        (populated ?? question.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Ask Pastor question updated.'
  );
}

export async function deleteAdminAskPastor(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const result = await AskPastorQuestion.findByIdAndDelete(id);
  if (!result) throw new AppError('Ask Pastor question not found', 404);
  sendResponse(reply, 200, { success: true }, 'Ask Pastor question deleted.');
}

export async function assignPastorAdminAskPastor(
  request: FastifyRequest<{ Params: { id: string }; Body: { pastorId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const pastorId = parseObjectId(request.body?.pastorId, 'pastorId');

  const pastor = await Pastor.findById(pastorId).lean();
  if (!pastor) throw new AppError('Pastor not found', 404);

  const question = await AskPastorQuestion.findById(id);
  if (!question) throw new AppError('Ask Pastor question not found', 404);

  question.pastor = pastorId;
  await question.save();

  const populated = await AskPastorQuestion.findById(question._id)
    .populate('pastor', PASTOR_POPULATE_SELECT)
    .lean();
  sendResponse(
    reply,
    200,
    {
      question: shapeAskPastorItem(
        (populated ?? question.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Pastor assigned.'
  );
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

  const populated = await AskPastorQuestion.findById(question._id)
    .populate('pastor', PASTOR_POPULATE_SELECT)
    .lean();
  sendResponse(
    reply,
    200,
    {
      question: shapeAskPastorItem(
        (populated ?? question.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Ask Pastor question rejected.'
  );
}
