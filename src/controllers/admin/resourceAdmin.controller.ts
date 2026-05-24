import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Resource } from '../../models/resource';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug } from '../../utils/helpers';
import { leanIdToString, requireAdmin, parseObjectId } from './admin.helpers';
import { runAdminList, runAdminGet } from '../../services/admin/runAdminListGet';
import {
  listAdminResourceRows,
  findAdminResourceById,
} from '../../repositories/admin/resource.repository';
import {
  applyCategoryOnlyExtendFilters,
  type ContentListQuery,
} from '../../services/admin/adminListFilters';
import { parseString } from '../../utils/helpers';

function shapeResourceItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    type: raw.type,
    category: raw.category,
    fileUrl: raw.fileUrl,
    coverImage: raw.coverImage,
    price: raw.price ?? 0,
    isFree: raw.isFree,
    downloads: raw.downloads ?? 0,
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

export async function listAdminResources(
  request: FastifyRequest<{ Querystring: ContentListQuery }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: ['createdAt', 'updatedAt', 'title', 'status'],
    searchFields: ['title', 'description', 'slug'],
    extendFilter: (filter, query) => {
      applyCategoryOnlyExtendFilters(filter, query);
      const type = parseString(query.type);
      if (type && type !== 'all') filter.type = type;
    },
    listRows: listAdminResourceRows,
    shapeItem: shapeResourceItem,
    collectionKey: 'resources',
    message: 'Resources list loaded.',
  });
  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminResource(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminGet(request, {
    findById: findAdminResourceById,
    shapeItem: shapeResourceItem,
    itemKey: 'resource',
    message: 'Resource loaded.',
    notFoundMessage: 'Resource not found',
  });
  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function createAdminResource(
  request: FastifyRequest<{
    Body: {
      title: string;
      type: 'ebook' | 'template' | 'beat' | 'wallpaper' | 'affiliate';
      description?: string;
      category?: string;
      fileUrl?: string;
      coverImage?: string;
      price?: number;
      isFree?: boolean;
      status?: 'draft' | 'published' | 'archived';
      isFeatured?: boolean;
      displayOrder?: number;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body;
  if (!body?.title || typeof body.title !== 'string' || !body.title.trim()) {
    throw new AppError('Title is required', 400);
  }
  if (!body?.type) {
    throw new AppError('Type is required', 400);
  }

  const slug = await generateUniqueSlug(Resource, body.title.trim());

  const resource = await Resource.create({
    title: body.title.trim(),
    slug,
    type: body.type,
    description: body.description ?? '',
    category: body.category ?? '',
    fileUrl: body.fileUrl ?? '',
    coverImage: body.coverImage ?? '',
    price: body.price ?? 0,
    isFree: body.isFree ?? true,
    status: body.status ?? 'draft',
    isFeatured: body.isFeatured ?? false,
    displayOrder: body.displayOrder ?? 0,
  });

  const populated = await Resource.findById(resource._id).lean();
  sendResponse(
    reply,
    201,
    { resource: shapeResourceItem((populated ?? resource) as unknown as Record<string, unknown>) },
    'Resource created.'
  );
}

export async function updateAdminResource(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      title?: string;
      type?: 'ebook' | 'template' | 'beat' | 'wallpaper' | 'affiliate';
      description?: string;
      category?: string;
      fileUrl?: string;
      coverImage?: string;
      price?: number;
      isFree?: boolean;
      status?: 'draft' | 'published' | 'archived';
      isFeatured?: boolean;
      displayOrder?: number;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const resource = await Resource.findById(id);
  if (!resource) throw new AppError('Resource not found', 404);

  const body = request.body ?? {};
  if (body.title !== undefined) resource.title = body.title;
  if (body.type !== undefined) resource.type = body.type;
  if (body.description !== undefined) resource.description = body.description;
  if (body.category !== undefined) resource.category = body.category;
  if (body.fileUrl !== undefined) resource.fileUrl = body.fileUrl;
  if (body.coverImage !== undefined) resource.coverImage = body.coverImage;
  if (body.price !== undefined) resource.price = body.price;
  if (body.isFree !== undefined) resource.isFree = body.isFree;
  if (body.status !== undefined) resource.status = body.status;
  if (body.isFeatured !== undefined) resource.isFeatured = body.isFeatured;
  if (body.displayOrder !== undefined) resource.displayOrder = body.displayOrder;

  await resource.save();

  const populated = await Resource.findById(resource._id).lean();
  sendResponse(
    reply,
    200,
    {
      resource: shapeResourceItem(
        (populated ?? resource.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Resource updated.'
  );
}

export async function deleteAdminResource(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const result = await Resource.findByIdAndDelete(id);
  if (!result) throw new AppError('Resource not found', 404);
  sendResponse(reply, 200, { success: true }, 'Resource deleted.');
}

export async function approveAdminResource(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const resource = await Resource.findById(id);
  if (!resource) throw new AppError('Resource not found', 404);

  resource.status = 'published';
  resource.approvedAt = new Date();
  resource.approvedBy = new mongoose.Types.ObjectId(userId);
  resource.rejectionReason = '';
  resource.rejectedAt = null;
  resource.rejectedBy = null;
  await resource.save();

  const populated = await Resource.findById(resource._id).lean();
  sendResponse(
    reply,
    200,
    {
      resource: shapeResourceItem(
        (populated ?? resource.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Resource approved.'
  );
}

export async function rejectAdminResource(
  request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const resource = await Resource.findById(id);
  if (!resource) throw new AppError('Resource not found', 404);

  const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';
  resource.status = 'archived';
  resource.rejectionReason = reason;
  resource.rejectedAt = new Date();
  resource.rejectedBy = new mongoose.Types.ObjectId(userId);
  resource.approvedAt = null;
  resource.approvedBy = null;
  await resource.save();

  const populated = await Resource.findById(resource._id).lean();
  sendResponse(
    reply,
    200,
    {
      resource: shapeResourceItem(
        (populated ?? resource.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Resource rejected.'
  );
}
