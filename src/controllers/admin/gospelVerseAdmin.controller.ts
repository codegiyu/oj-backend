import { FastifyRequest, FastifyReply } from 'fastify';
import { GospelVerse } from '../../models/gospelVerse';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { leanIdToString, parseObjectId } from './admin.helpers';
import { runAdminList, runAdminGet } from '../../services/admin/runAdminListGet';
import {
  listAdminGospelVerseRows,
  findAdminGospelVerseById,
} from '../../repositories/admin/gospelVerse.repository';
import { parseString } from '../../utils/helpers';

function parseVerseDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value.trim());
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  throw new AppError('A valid date is required', 400);
}

export function shapeGospelVerseItem(raw: Record<string, unknown>): Record<string, unknown> {
  const date = raw.date instanceof Date ? raw.date.toISOString() : raw.date;

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    verse: raw.verse,
    reference: raw.reference,
    date,
    isActive: raw.isActive ?? true,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

function applyGospelVerseStatusFilter(
  filter: Record<string, unknown>,
  query: { status?: string }
): void {
  const status = parseString(query.status);

  // `status` in query maps to `isActive`, not a document status field.
  delete filter.status;

  if (status === 'active') {
    filter.isActive = true;
    return;
  }

  if (status === 'inactive') {
    filter.isActive = false;
  }
}

export async function listAdminGospelVerses(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string; status?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: ['createdAt', 'updatedAt', 'date', 'reference'],
    defaultSort: '-date',
    searchFields: ['verse', 'reference'],
    extendFilter: applyGospelVerseStatusFilter,
    listRows: listAdminGospelVerseRows,
    shapeItem: shapeGospelVerseItem,
    collectionKey: 'gospelVerses',
    message: 'Gospel verses list loaded.',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminGospelVerse(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminGet(request, {
    findById: findAdminGospelVerseById,
    shapeItem: shapeGospelVerseItem,
    itemKey: 'gospelVerse',
    message: 'Gospel verse loaded.',
    notFoundMessage: 'Gospel verse not found',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function createAdminGospelVerse(
  request: FastifyRequest<{
    Body: { verse: string; reference: string; date?: string; isActive?: boolean };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body;

  if (!body?.verse || typeof body.verse !== 'string' || !body.verse.trim()) {
    throw new AppError('Verse text is required', 400);
  }

  if (!body?.reference || typeof body.reference !== 'string' || !body.reference.trim()) {
    throw new AppError('Reference is required', 400);
  }

  const verseDate = body.date != null ? parseVerseDate(body.date) : new Date();

  const doc = await GospelVerse.create({
    verse: body.verse.trim(),
    reference: body.reference.trim(),
    date: verseDate,
    isActive: body.isActive ?? true,
  });

  const populated = await GospelVerse.findById(doc._id).lean();

  sendResponse(
    reply,
    201,
    {
      gospelVerse: shapeGospelVerseItem(
        (populated ?? doc.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Gospel verse created.'
  );
}

export async function updateAdminGospelVerse(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { verse?: string; reference?: string; date?: string; isActive?: boolean };
  }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const doc = await GospelVerse.findById(id);

  if (!doc) throw new AppError('Gospel verse not found', 404);

  const body = request.body ?? {};

  if (body.verse !== undefined) {
    if (!body.verse.trim()) throw new AppError('Verse text cannot be empty', 400);
    doc.verse = body.verse.trim();
  }

  if (body.reference !== undefined) {
    if (!body.reference.trim()) throw new AppError('Reference cannot be empty', 400);
    doc.reference = body.reference.trim();
  }

  if (body.date !== undefined) {
    doc.date = parseVerseDate(body.date);
  }

  if (body.isActive !== undefined) {
    doc.isActive = body.isActive;
  }

  await doc.save();

  const populated = await GospelVerse.findById(doc._id).lean();

  sendResponse(
    reply,
    200,
    {
      gospelVerse: shapeGospelVerseItem(
        (populated ?? doc.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Gospel verse updated.'
  );
}

export async function deleteAdminGospelVerse(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const result = await GospelVerse.findByIdAndDelete(id);

  if (!result) throw new AppError('Gospel verse not found', 404);

  sendResponse(reply, 200, { success: true }, 'Gospel verse deleted.');
}
