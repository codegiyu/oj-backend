import { FastifyRequest, FastifyReply } from 'fastify';
import { PrayerRequest } from '../../models/prayerRequest';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug, parsePositiveInteger, parseSearch, parseString, normalizeSort } from '../../utils/helpers';
import { requireAdmin, parseObjectId } from './admin.helpers';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status'];

function shapePrayerRequestItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
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
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { author: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, '-createdAt');

  const [items, total] = await Promise.all([
    PrayerRequest.find(filter).sort(sortStr).skip(skip).limit(limit).lean(),
    PrayerRequest.countDocuments(filter),
  ]);

  const prayerRequests = (items as Record<string, unknown>[]).map(shapePrayerRequestItem);

  sendResponse(reply, 200, {
    prayerRequests,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  }, 'Prayer requests list loaded.');
}

export async function getAdminPrayerRequest(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const doc = await PrayerRequest.findById(id).lean();
  if (!doc) throw new AppError('Prayer request not found', 404);
  sendResponse(reply, 200, { prayerRequest: shapePrayerRequestItem(doc as unknown as Record<string, unknown>) }, 'Prayer request loaded.');
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
  requireAdmin(request);
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
  sendResponse(reply, 201, { prayerRequest: shapePrayerRequestItem((populated ?? prayerRequest) as unknown as Record<string, unknown>) }, 'Prayer request created.');
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
  requireAdmin(request);
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
  sendResponse(reply, 200, { prayerRequest: shapePrayerRequestItem((populated ?? prayerRequest.toObject()) as Record<string, unknown>) }, 'Prayer request updated.');
}

export async function deleteAdminPrayerRequest(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const result = await PrayerRequest.findByIdAndDelete(id);
  if (!result) throw new AppError('Prayer request not found', 404);
  sendResponse(reply, 200, { success: true }, 'Prayer request deleted.');
}

export async function answerAdminPrayerRequest(
  request: FastifyRequest<{ Params: { id: string }; Body: { answer: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const prayerRequest = await PrayerRequest.findById(id);
  if (!prayerRequest) throw new AppError('Prayer request not found', 404);

  const answer = typeof request.body?.answer === 'string' ? request.body.answer.trim() : '';
  prayerRequest.testimony = answer;
  prayerRequest.status = 'answered';
  prayerRequest.answeredAt = new Date();
  await prayerRequest.save();

  const populated = await PrayerRequest.findById(prayerRequest._id).lean();
  sendResponse(reply, 200, { prayerRequest: shapePrayerRequestItem((populated ?? prayerRequest.toObject()) as Record<string, unknown>) }, 'Prayer request answered.');
}
