import { FastifyRequest, FastifyReply } from 'fastify';
import { Pastor } from '../../models/pastor';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug, parseString } from '../../utils/helpers';
import { parseObjectId } from './admin.helpers';
import { leanIdToString } from '../../utils/leanId';
import { runAdminList, runAdminGet } from '../../services/admin/runAdminListGet';
import {
  listAdminPastorRows,
  findAdminPastorById,
} from '../../repositories/admin/pastor.repository';

function shapePastorItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
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
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string; status?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: ['createdAt', 'updatedAt', 'name'],
    searchFields: ['name', 'title', 'bio'],
    extendFilter: (filter, query) => {
      const status = parseString(query.status);

      if (status === 'active') {
        filter.isActive = true;
        delete filter.status;
      } else if (status === 'inactive') {
        filter.isActive = false;
        delete filter.status;
      }
    },
    listRows: listAdminPastorRows,
    shapeItem: shapePastorItem,
    collectionKey: 'pastors',
    message: 'Pastors list loaded.',
  });
  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminPastor(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminGet(request, {
    findById: findAdminPastorById,
    shapeItem: shapePastorItem,
    itemKey: 'pastor',
    message: 'Pastor loaded.',
    notFoundMessage: 'Pastor not found',
  });
  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
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
  sendResponse(
    reply,
    201,
    { pastor: shapePastorItem((populated ?? pastor) as unknown as Record<string, unknown>) },
    'Pastor created.'
  );
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
  const id = parseObjectId(request.params.id);
  const pastor = await Pastor.findById(id);
  if (!pastor) throw new AppError('Pastor not found', 404);

  const body = request.body ?? {};
  if (body.name !== undefined) pastor.name = body.name;
  if (body.title !== undefined) pastor.title = body.title;
  if (body.church !== undefined) pastor.church = body.church;
  if (body.bio !== undefined) pastor.bio = body.bio;
  if (body.image !== undefined) pastor.image = body.image;
  if (body.expertise !== undefined)
    pastor.expertise = Array.isArray(body.expertise) ? body.expertise : pastor.expertise;
  if (body.isFeatured !== undefined) pastor.isFeatured = body.isFeatured;
  if (body.isActive !== undefined) pastor.isActive = body.isActive;
  if (body.displayOrder !== undefined) pastor.displayOrder = body.displayOrder;

  await pastor.save();

  const populated = await Pastor.findById(pastor._id).lean();
  sendResponse(
    reply,
    200,
    {
      pastor: shapePastorItem(
        (populated ?? pastor.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Pastor updated.'
  );
}

export async function deleteAdminPastor(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const result = await Pastor.findByIdAndDelete(id);
  if (!result) throw new AppError('Pastor not found', 404);
  sendResponse(reply, 200, { success: true }, 'Pastor deleted.');
}
