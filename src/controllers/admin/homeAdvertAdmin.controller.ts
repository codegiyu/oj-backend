import { FastifyRequest, FastifyReply } from 'fastify';
import { HomeAdvert } from '../../models/homeAdvert';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { parsePositiveInteger, parseString, normalizeSort } from '../../utils/helpers';
import { parseObjectId } from './admin.helpers';
import type { HomeAdvertSlot } from '../../lib/types/constants';
import { HOME_ADVERT_SLOTS } from '../../lib/types/constants';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'displayOrder'];

function shapeAdvert(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    slot: raw.slot,
    imageUrl: raw.imageUrl,
    linkUrl: raw.linkUrl,
    displayOrder: raw.displayOrder ?? 0,
    isActive: raw.isActive ?? true,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

export async function listAdminHomeAdverts(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; slot?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const limit = parsePositiveInteger(request.query.limit, 25, 100);
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};
  const slot = parseString(request.query.slot);
  if (slot && (HOME_ADVERT_SLOTS as readonly string[]).includes(slot)) filter.slot = slot;
  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, 'displayOrder');
  const [items, total] = await Promise.all([
    HomeAdvert.find(filter).sort(sortStr).skip(skip).limit(limit).lean(),
    HomeAdvert.countDocuments(filter),
  ]);
  const adverts = (items as unknown as Record<string, unknown>[]).map(shapeAdvert);
  sendResponse(
    reply,
    200,
    {
      adverts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    },
    'Home adverts loaded.'
  );
}

export async function createAdminHomeAdvert(
  request: FastifyRequest<{
    Body: {
      slot: HomeAdvertSlot;
      imageUrl: string;
      linkUrl?: string;
      displayOrder?: number;
      isActive?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body;
  if (!body?.slot || !(HOME_ADVERT_SLOTS as readonly string[]).includes(body.slot)) {
    throw new AppError('Invalid slot', 400);
  }
  if (!body.imageUrl?.trim()) throw new AppError('imageUrl is required', 400);
  const doc = await HomeAdvert.create({
    slot: body.slot,
    imageUrl: body.imageUrl.trim(),
    linkUrl: body.linkUrl?.trim() ?? '',
    displayOrder: body.displayOrder ?? 0,
    isActive: body.isActive ?? true,
  });
  const populated = await HomeAdvert.findById(doc._id).lean();
  sendResponse(
    reply,
    201,
    { advert: shapeAdvert((populated ?? doc.toObject()) as unknown as Record<string, unknown>) },
    'Advert created.'
  );
}

export async function updateAdminHomeAdvert(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      slot?: HomeAdvertSlot;
      imageUrl?: string;
      linkUrl?: string;
      displayOrder?: number;
      isActive?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const advert = await HomeAdvert.findById(id);
  if (!advert) throw new AppError('Advert not found', 404);
  const body = request.body ?? {};
  if (body.slot !== undefined) {
    if (!(HOME_ADVERT_SLOTS as readonly string[]).includes(body.slot))
      throw new AppError('Invalid slot', 400);
    advert.slot = body.slot;
  }
  if (body.imageUrl !== undefined) advert.imageUrl = body.imageUrl;
  if (body.linkUrl !== undefined) advert.linkUrl = body.linkUrl;
  if (body.displayOrder !== undefined) advert.displayOrder = body.displayOrder;
  if (body.isActive !== undefined) advert.isActive = body.isActive;
  await advert.save();
  const populated = await HomeAdvert.findById(advert._id).lean();
  sendResponse(
    reply,
    200,
    { advert: shapeAdvert((populated ?? advert.toObject()) as unknown as Record<string, unknown>) },
    'Advert updated.'
  );
}

export async function deleteAdminHomeAdvert(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const result = await HomeAdvert.findByIdAndDelete(id);
  if (!result) throw new AppError('Advert not found', 404);
  sendResponse(reply, 200, { success: true }, 'Advert deleted.');
}
