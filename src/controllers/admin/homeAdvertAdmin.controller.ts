import { FastifyRequest, FastifyReply } from 'fastify';
import { HomeAdvert } from '../../models/homeAdvert';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { parseString } from '../../utils/helpers';
import { leanIdToString, parseObjectId } from './admin.helpers';
import { runAdminList } from '../../services/admin/runAdminListGet';
import { listAdminHomeAdvertRows } from '../../repositories/admin/homeAdvertAdmin.repository';
import type { HomeAdvertSlot } from '../../lib/types/constants';
import { HOME_ADVERT_SLOTS } from '../../lib/types/constants';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'displayOrder'];

function shapeAdvert(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
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
    Querystring: { page?: string; limit?: string; slot?: string; search?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: SORT_FIELDS,
    defaultSort: 'displayOrder',
    searchFields: ['linkUrl'],
    extendFilter: (filter, query) => {
      const slot = parseString(query.slot);

      if (slot && (HOME_ADVERT_SLOTS as readonly string[]).includes(slot)) {
        filter.slot = slot;
      }
    },
    listRows: listAdminHomeAdvertRows,
    shapeItem: shapeAdvert,
    collectionKey: 'adverts',
    message: 'Home adverts loaded.',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
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
  const doc = await HomeAdvert.create({
    slot: body.slot,
    imageUrl: body.imageUrl?.trim() ?? '',
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
  if (body.imageUrl !== undefined) {
    const trimmed = body.imageUrl.trim();
    if (!trimmed) throw new AppError('imageUrl cannot be empty', 400);
    advert.imageUrl = trimmed;
  }
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
