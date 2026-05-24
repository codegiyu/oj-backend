import { FastifyRequest, FastifyReply } from 'fastify';
import { PrayerRequest } from '../../models/prayerRequest';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug } from '../../utils/helpers';
import { leanIdToString, parseObjectId } from './admin.helpers';
import { runAdminList, runAdminGet } from '../../services/admin/runAdminListGet';
import {
  listAdminPrayerRequestRows,
  findAdminPrayerRequestById,
} from '../../repositories/admin/prayerRequest.repository';
import {
  applyCategoryOnlyExtendFilters,
  type ContentListQuery,
} from '../../services/admin/adminListFilters';

function shapePrayerRequestItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    content: raw.content,
    author: raw.author,
    email: raw.email,
    category: raw.category,
    prayers: raw.prayers ?? 0,
    comments: raw.comments ?? 0,
    urgent: raw.urgent,
    testimony: raw.testimony,
    answeredAt: raw.answeredAt,
    status: raw.status,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

export async function listAdminPrayerRequests(
  request: FastifyRequest<{ Querystring: ContentListQuery }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: ['createdAt', 'updatedAt', 'title', 'status'],
    searchFields: ['title', 'content', 'author'],
    extendFilter: applyCategoryOnlyExtendFilters,
    listRows: listAdminPrayerRequestRows,
    shapeItem: shapePrayerRequestItem,
    collectionKey: 'prayerRequests',
    message: 'Prayer requests list loaded.',
  });
  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminPrayerRequest(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminGet(request, {
    findById: findAdminPrayerRequestById,
    shapeItem: shapePrayerRequestItem,
    itemKey: 'prayerRequest',
    message: 'Prayer request loaded.',
    notFoundMessage: 'Prayer request not found',
  });
  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function createAdminPrayerRequest(
  request: FastifyRequest<{
    Body: {
      title: string;
      content: string;
      author: string;
      email?: string;
      category?: string;
      urgent?: boolean;
      testimony?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body;
  if (!body?.title || typeof body.title !== 'string' || !body.title.trim()) {
    throw new AppError('Title is required', 400);
  }
  if (!body?.content || typeof body.content !== 'string' || !body.content.trim()) {
    throw new AppError('Content is required', 400);
  }
  if (!body?.author || typeof body.author !== 'string' || !body.author.trim()) {
    throw new AppError('Author is required', 400);
  }

  const slug = await generateUniqueSlug(PrayerRequest, body.title.trim());

  const prayerRequest = await PrayerRequest.create({
    title: body.title.trim(),
    slug,
    content: body.content.trim(),
    author: body.author.trim(),
    email: body.email ?? '',
    category: body.category ?? '',
    urgent: body.urgent ?? false,
    testimony: body.testimony ?? '',
  });

  const populated = await PrayerRequest.findById(prayerRequest._id).lean();
  sendResponse(
    reply,
    201,
    {
      prayerRequest: shapePrayerRequestItem(
        (populated ?? prayerRequest) as unknown as Record<string, unknown>
      ),
    },
    'Prayer request created.'
  );
}

export async function updateAdminPrayerRequest(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      title?: string;
      content?: string;
      author?: string;
      email?: string;
      category?: string;
      urgent?: boolean;
      testimony?: string;
      status?: 'active' | 'answered';
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const prayerRequest = await PrayerRequest.findById(id);
  if (!prayerRequest) throw new AppError('Prayer request not found', 404);

  const body = request.body ?? {};
  if (body.title !== undefined) prayerRequest.title = body.title;
  if (body.content !== undefined) prayerRequest.content = body.content;
  if (body.author !== undefined) prayerRequest.author = body.author;
  if (body.email !== undefined) prayerRequest.email = body.email;
  if (body.category !== undefined) prayerRequest.category = body.category;
  if (body.urgent !== undefined) prayerRequest.urgent = body.urgent;
  if (body.testimony !== undefined) prayerRequest.testimony = body.testimony;
  if (body.status !== undefined) prayerRequest.status = body.status;

  await prayerRequest.save();

  const populated = await PrayerRequest.findById(prayerRequest._id).lean();
  sendResponse(
    reply,
    200,
    {
      prayerRequest: shapePrayerRequestItem(
        (populated ?? prayerRequest.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Prayer request updated.'
  );
}

export async function deleteAdminPrayerRequest(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const result = await PrayerRequest.findByIdAndDelete(id);
  if (!result) throw new AppError('Prayer request not found', 404);
  sendResponse(reply, 200, { success: true }, 'Prayer request deleted.');
}

export async function answerAdminPrayerRequest(
  request: FastifyRequest<{ Params: { id: string }; Body: { answer: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const prayerRequest = await PrayerRequest.findById(id);
  if (!prayerRequest) throw new AppError('Prayer request not found', 404);

  const answer = typeof request.body?.answer === 'string' ? request.body.answer.trim() : '';
  prayerRequest.testimony = answer;
  prayerRequest.status = 'answered';
  prayerRequest.answeredAt = new Date();
  await prayerRequest.save();

  const populated = await PrayerRequest.findById(prayerRequest._id).lean();
  sendResponse(
    reply,
    200,
    {
      prayerRequest: shapePrayerRequestItem(
        (populated ?? prayerRequest.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Prayer request answered.'
  );
}
