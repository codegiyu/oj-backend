import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Testimony } from '../../models/testimony';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug, parsePositiveInteger, parseSearch, parseString, normalizeSort } from '../../utils/helpers';
import { requireAdmin, parseObjectId } from './admin.helpers';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'author', 'status'];

function shapeTestimonyItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    slug: raw.slug,
    author: raw.author,
    avatar: raw.avatar,
    content: raw.content,
    likes: raw.likes ?? 0,
    comments: raw.comments ?? 0,
    category: raw.category,
    status: raw.status,
    isFeatured: raw.isFeatured,
    displayOrder: raw.displayOrder,
    approvedAt: raw.approvedAt,
    approvedBy: raw.approvedBy,
    rejectionReason: raw.rejectionReason,
    rejectedAt: raw.rejectedAt,
    rejectedBy: raw.rejectedBy,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

export async function listAdminTestimonies(
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
      { author: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, '-createdAt');

  const [items, total] = await Promise.all([
    Testimony.find(filter).sort(sortStr).skip(skip).limit(limit).lean(),
    Testimony.countDocuments(filter),
  ]);

  const testimonies = (items as Record<string, unknown>[]).map(shapeTestimonyItem);

  sendResponse(reply, 200, {
    testimonies,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  }, 'Testimonies list loaded.');
}

export async function getAdminTestimony(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const doc = await Testimony.findById(id).lean();
  if (!doc) throw new AppError('Testimony not found', 404);
  sendResponse(reply, 200, { testimony: shapeTestimonyItem(doc as unknown as Record<string, unknown>) }, 'Testimony loaded.');
}

export async function createAdminTestimony(
  request: FastifyRequest<{
    Body: {
      author: string;
      content: string;
      avatar?: string;
      category?: string;
      status?: 'draft' | 'published' | 'archived';
      isFeatured?: boolean;
      displayOrder?: number;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const body = request.body;
  if (!body?.author || typeof body.author !== 'string' || !body.author.trim()) {
    throw new AppError('Author is required', 400);
  }
  if (!body?.content || typeof body.content !== 'string' || !body.content.trim()) {
    throw new AppError('Content is required', 400);
  }

  const slugBase = `${body.author.trim()}-${Date.now()}`;
  const slug = await generateUniqueSlug(Testimony, slugBase);

  const testimony = await Testimony.create({
    author: body.author.trim(),
    content: body.content.trim(),
    slug,
    avatar: body.avatar ?? '',
    category: body.category ?? '',
    status: body.status ?? 'draft',
    isFeatured: body.isFeatured ?? false,
    displayOrder: body.displayOrder ?? 0,
  });

  const populated = await Testimony.findById(testimony._id).lean();
  sendResponse(reply, 201, { testimony: shapeTestimonyItem((populated ?? testimony) as unknown as Record<string, unknown>) }, 'Testimony created.');
}

export async function updateAdminTestimony(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      author?: string;
      content?: string;
      avatar?: string;
      category?: string;
      status?: 'draft' | 'published' | 'archived';
      isFeatured?: boolean;
      displayOrder?: number;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const testimony = await Testimony.findById(id);
  if (!testimony) throw new AppError('Testimony not found', 404);

  const body = request.body ?? {};
  if (body.author !== undefined) testimony.author = body.author;
  if (body.content !== undefined) testimony.content = body.content;
  if (body.avatar !== undefined) testimony.avatar = body.avatar;
  if (body.category !== undefined) testimony.category = body.category;
  if (body.status !== undefined) testimony.status = body.status;
  if (body.isFeatured !== undefined) testimony.isFeatured = body.isFeatured;
  if (body.displayOrder !== undefined) testimony.displayOrder = body.displayOrder;

  await testimony.save();

  const populated = await Testimony.findById(testimony._id).lean();
  sendResponse(reply, 200, { testimony: shapeTestimonyItem((populated ?? testimony.toObject()) as Record<string, unknown>) }, 'Testimony updated.');
}

export async function deleteAdminTestimony(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const result = await Testimony.findByIdAndDelete(id);
  if (!result) throw new AppError('Testimony not found', 404);
  sendResponse(reply, 200, { success: true }, 'Testimony deleted.');
}

export async function approveAdminTestimony(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const testimony = await Testimony.findById(id);
  if (!testimony) throw new AppError('Testimony not found', 404);

  testimony.status = 'published';
  testimony.approvedAt = new Date();
  testimony.approvedBy = new mongoose.Types.ObjectId(userId);
  testimony.rejectionReason = '';
  testimony.rejectedAt = null;
  testimony.rejectedBy = null;
  await testimony.save();

  const populated = await Testimony.findById(testimony._id).lean();
  sendResponse(reply, 200, { testimony: shapeTestimonyItem((populated ?? testimony.toObject()) as Record<string, unknown>) }, 'Testimony approved.');
}

export async function rejectAdminTestimony(
  request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const testimony = await Testimony.findById(id);
  if (!testimony) throw new AppError('Testimony not found', 404);

  const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';
  testimony.status = 'archived';
  testimony.rejectionReason = reason;
  testimony.rejectedAt = new Date();
  testimony.rejectedBy = new mongoose.Types.ObjectId(userId);
  testimony.approvedAt = null;
  testimony.approvedBy = null;
  await testimony.save();

  const populated = await Testimony.findById(testimony._id).lean();
  sendResponse(reply, 200, { testimony: shapeTestimonyItem((populated ?? testimony.toObject()) as Record<string, unknown>) }, 'Testimony rejected.');
}
