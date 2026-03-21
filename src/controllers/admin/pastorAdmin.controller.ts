import { FastifyRequest, FastifyReply } from 'fastify';
import { Pastor } from '../../models/pastor';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug, parsePositiveInteger, parseSearch, parseString, normalizeSort } from '../../utils/helpers';
import { requireAdmin, parseObjectId } from './admin.helpers';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'name'];

function shapePastorItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    name: raw.name,
    slug: raw.slug,
    title: raw.title,
    church: raw.church,
    bio: raw.bio,
    image: raw.image,
    expertise: raw.expertise,
    questionsAnswered: raw.questionsAnswered ?? 0,
    rating: raw.rating ?? 0,
    isFeatured: raw.isFeatured,
    isActive: raw.isActive,
    displayOrder: raw.displayOrder,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

export async function listAdminPastors(
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
  if (status === 'active') filter.isActive = true;
  else if (status === 'inactive') filter.isActive = false;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { church: { $regex: search, $options: 'i' } },
    ];
  }

  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, '-createdAt');

  const [items, total] = await Promise.all([
    Pastor.find(filter).sort(sortStr).skip(skip).limit(limit).lean(),
    Pastor.countDocuments(filter),
  ]);

  const pastors = (items as Record<string, unknown>[]).map(shapePastorItem);

  sendResponse(reply, 200, {
    pastors,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  }, 'Pastors list loaded.');
}

export async function getAdminPastor(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const doc = await Pastor.findById(id).lean();
  if (!doc) throw new AppError('Pastor not found', 404);
  sendResponse(reply, 200, { pastor: shapePastorItem(doc as unknown as Record<string, unknown>) }, 'Pastor loaded.');
}

export async function createAdminPastor(
  request: FastifyRequest<{
    Body: {
      name: string;
      title?: string;
      church?: string;
      bio?: string;
      image?: string;
      expertise?: string[];
      isFeatured?: boolean;
      isActive?: boolean;
      displayOrder?: number;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const body = request.body;
  if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) {
    throw new AppError('Name is required', 400);
  }

  const slug = await generateUniqueSlug(Pastor, body.name.trim());

  const pastor = await Pastor.create({
    name: body.name.trim(),
    slug,
    title: body.title ?? '',
    church: body.church ?? '',
    bio: body.bio ?? '',
    image: body.image ?? '',
    expertise: Array.isArray(body.expertise) ? body.expertise : [],
    isFeatured: body.isFeatured ?? false,
    isActive: body.isActive ?? true,
    displayOrder: body.displayOrder ?? 0,
  });

  const populated = await Pastor.findById(pastor._id).lean();
  sendResponse(reply, 201, { pastor: shapePastorItem((populated ?? pastor) as unknown as Record<string, unknown>) }, 'Pastor created.');
}

export async function updateAdminPastor(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      name?: string;
      title?: string;
      church?: string;
      bio?: string;
      image?: string;
      expertise?: string[];
      isFeatured?: boolean;
      isActive?: boolean;
      displayOrder?: number;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const pastor = await Pastor.findById(id);
  if (!pastor) throw new AppError('Pastor not found', 404);

  const body = request.body ?? {};
  if (body.name !== undefined) pastor.name = body.name;
  if (body.title !== undefined) pastor.title = body.title;
  if (body.church !== undefined) pastor.church = body.church;
  if (body.bio !== undefined) pastor.bio = body.bio;
  if (body.image !== undefined) pastor.image = body.image;
  if (body.expertise !== undefined) pastor.expertise = Array.isArray(body.expertise) ? body.expertise : pastor.expertise;
  if (body.isFeatured !== undefined) pastor.isFeatured = body.isFeatured;
  if (body.isActive !== undefined) pastor.isActive = body.isActive;
  if (body.displayOrder !== undefined) pastor.displayOrder = body.displayOrder;

  await pastor.save();

  const populated = await Pastor.findById(pastor._id).lean();
  sendResponse(reply, 200, { pastor: shapePastorItem((populated ?? pastor.toObject()) as Record<string, unknown>) }, 'Pastor updated.');
}

export async function deleteAdminPastor(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const result = await Pastor.findByIdAndDelete(id);
  if (!result) throw new AppError('Pastor not found', 404);
  sendResponse(reply, 200, { success: true }, 'Pastor deleted.');
}
