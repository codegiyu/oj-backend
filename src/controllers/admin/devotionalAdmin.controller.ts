import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Devotional } from '../../models/devotional';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug } from '../../utils/helpers';
import { leanIdToString, requireAdmin, parseObjectId } from './admin.helpers';
import { runAdminList, runAdminGet } from '../../services/admin/runAdminListGet';
import {
  listAdminDevotionalRows,
  findAdminDevotionalById,
} from '../../repositories/admin/devotional.repository';
import { toArtistSummary } from '../artist/artist.helpers';
import {
  resolveArtistIdForAdminContent,
  applyContentOwnershipUpdate,
} from '../../services/contentOwner.service';
import { DEVOTIONAL_TYPES, type DevotionalType } from '../../lib/types/constants';
import {
  applyContentListExtendFilters,
  type ContentListQuery,
} from '../../services/admin/adminListFilters';

const DEVOTIONAL_TYPES_SET = new Set<string>(DEVOTIONAL_TYPES);

function resolveDevotionalType(raw: string | undefined): DevotionalType {
  const t = raw?.trim();
  if (t && DEVOTIONAL_TYPES_SET.has(t)) return t as DevotionalType;
  return 'latest';
}

const artistPopulate = {
  path: 'artist' as const,
  select: '_id name slug image user',
  populate: { path: 'user', select: '_id' },
};

function ownerApiFields(raw: Record<string, unknown>): {
  ownerLocked: boolean;
  ownerUserId?: string;
} {
  const artistVal = raw.artist;

  if (artistVal == null) return { ownerLocked: false };

  if (
    typeof artistVal === 'object' &&
    artistVal !== null &&
    (artistVal as { _id?: mongoose.Types.ObjectId | null })._id == null
  ) {
    return { ownerLocked: false };
  }

  const u =
    typeof artistVal === 'object' && artistVal !== null && 'user' in artistVal
      ? (artistVal as { user?: { _id?: mongoose.Types.ObjectId | null } | null }).user
      : undefined;

  let ownerUserId: string | undefined;

  if (u != null && typeof u === 'object' && u !== null && '_id' in u) {
    ownerUserId = u._id != null ? leanIdToString(u._id) : undefined;
  } else if (u != null && u._id != null && mongoose.Types.ObjectId.isValid(leanIdToString(u._id))) {
    ownerUserId = u._id != null ? leanIdToString(u._id) : undefined;
  }

  return { ownerLocked: true, ...(ownerUserId ? { ownerUserId } : {}) };
}

function shapeDevotionalItem(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(
    raw.artist as {
      _id: mongoose.Types.ObjectId | null;
      name?: string;
      slug?: string;
      image?: string;
    } | null
  );
  const owner = ownerApiFields(raw);
  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    coverImage: raw.coverImage ?? '',
    excerpt: raw.excerpt,
    content: raw.content,
    type: raw.type,
    category: raw.category,
    author: raw.author,
    verse: raw.verse,
    date: raw.date,
    readingTime: raw.readingTime,
    lessons: raw.lessons,
    duration: raw.duration,
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    status: raw.status,
    isFeatured: raw.isFeatured,
    displayOrder: raw.displayOrder,
    ownerLocked: owner.ownerLocked,
    ...(owner.ownerUserId ? { ownerUserId: owner.ownerUserId } : {}),
    approvedAt: raw.approvedAt,
    approvedBy: raw.approvedBy,
    rejectionReason: raw.rejectionReason,
    rejectedAt: raw.rejectedAt,
    rejectedBy: raw.rejectedBy,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    ...(artist && { artist }),
  };
}

export async function listAdminDevotionals(
  request: FastifyRequest<{ Querystring: ContentListQuery }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: ['createdAt', 'updatedAt', 'title', 'status', 'date', 'views', 'plays'],
    searchFields: ['title', 'content', 'excerpt', 'slug'],
    extendFilter: applyContentListExtendFilters,
    listRows: listAdminDevotionalRows,
    shapeItem: shapeDevotionalItem,
    collectionKey: 'devotionals',
    message: 'Devotionals list loaded.',
  });
  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminDevotional(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminGet(request, {
    findById: findAdminDevotionalById,
    shapeItem: shapeDevotionalItem,
    itemKey: 'devotional',
    message: 'Devotional loaded.',
    notFoundMessage: 'Devotional not found',
  });
  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function createAdminDevotional(
  request: FastifyRequest<{
    Body: {
      title: string;
      coverImage?: string;
      excerpt?: string;
      content?: string;
      type?: string;
      category?: string;
      author?: string;
      verse?: string;
      date?: string | Date;
      readingTime?: number;
      lessons?: string[];
      duration?: number;
      status?: 'draft' | 'published' | 'archived';
      isFeatured?: boolean;
      displayOrder?: number;
      artistId?: string;
      ownerUserId?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body;
  if (!body?.title || typeof body.title !== 'string' || !body.title.trim()) {
    throw new AppError('Title is required', 400);
  }

  const resolvedArtistId = await resolveArtistIdForAdminContent({
    ownerUserId: body.ownerUserId,
    artistId: body.artistId,
  });
  const slugFilter = resolvedArtistId ? { artist: resolvedArtistId } : { artist: null };
  const slug = await generateUniqueSlug(Devotional, body.title.trim(), slugFilter);

  const devotional = await Devotional.create({
    title: body.title.trim(),
    slug,
    artist: resolvedArtistId ?? null,
    coverImage: body.coverImage ?? '',
    excerpt: body.excerpt ?? '',
    content: body.content ?? '',
    type: resolveDevotionalType(body.type),
    category: body.category ?? '',
    author: body.author ?? '',
    verse: body.verse ?? '',
    date: body.date ? new Date(body.date) : undefined,
    readingTime: body.readingTime ?? 0,
    lessons: Array.isArray(body.lessons) ? body.lessons : [],
    duration: body.duration ?? 0,
    views: 0,
    plays: 0,
    status: body.status ?? 'draft',
    isFeatured: body.isFeatured ?? false,
    displayOrder: body.displayOrder ?? 0,
  });

  const populated = await Devotional.findById(devotional._id).populate(artistPopulate).lean();
  sendResponse(
    reply,
    201,
    {
      devotional: shapeDevotionalItem(
        (populated ?? devotional) as unknown as Record<string, unknown>
      ),
    },
    'Devotional created.'
  );
}

export async function updateAdminDevotional(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      title?: string;
      coverImage?: string;
      excerpt?: string;
      content?: string;
      type?: string;
      category?: string;
      author?: string;
      verse?: string;
      date?: string | Date;
      readingTime?: number;
      lessons?: string[];
      duration?: number;
      status?: 'draft' | 'published' | 'archived';
      isFeatured?: boolean;
      displayOrder?: number;
      artistId?: string;
      ownerUserId?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const devotional = await Devotional.findById(id);
  if (!devotional) throw new AppError('Devotional not found', 404);

  const body = request.body ?? {};
  const newArtistId = await applyContentOwnershipUpdate(devotional, body, 'Devotional');
  if (newArtistId) devotional.artist = newArtistId;

  if (body.title !== undefined) devotional.title = body.title;
  if (body.coverImage !== undefined) devotional.coverImage = body.coverImage;
  if (body.excerpt !== undefined) devotional.excerpt = body.excerpt;
  if (body.content !== undefined) devotional.content = body.content;
  if (body.type !== undefined) devotional.type = body.type as typeof devotional.type;
  if (body.category !== undefined) devotional.category = body.category;
  if (body.author !== undefined) devotional.author = body.author;
  if (body.verse !== undefined) devotional.verse = body.verse;
  if (body.date !== undefined) devotional.date = body.date ? new Date(body.date) : undefined;
  if (body.readingTime !== undefined) devotional.readingTime = body.readingTime;
  if (body.lessons !== undefined)
    devotional.lessons = Array.isArray(body.lessons) ? body.lessons : devotional.lessons;
  if (body.duration !== undefined) devotional.duration = body.duration;
  if (body.status !== undefined) devotional.status = body.status;
  if (body.isFeatured !== undefined) devotional.isFeatured = body.isFeatured;
  if (body.displayOrder !== undefined) devotional.displayOrder = body.displayOrder;

  await devotional.save();

  const populated = await Devotional.findById(devotional._id).populate(artistPopulate).lean();
  sendResponse(
    reply,
    200,
    {
      devotional: shapeDevotionalItem(
        (populated ?? devotional.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Devotional updated.'
  );
}

export async function deleteAdminDevotional(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const result = await Devotional.findByIdAndDelete(id);
  if (!result) throw new AppError('Devotional not found', 404);
  sendResponse(reply, 200, { success: true }, 'Devotional deleted.');
}

export async function approveAdminDevotional(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const devotional = await Devotional.findById(id);
  if (!devotional) throw new AppError('Devotional not found', 404);

  devotional.status = 'published';
  devotional.approvedAt = new Date();
  devotional.approvedBy = new mongoose.Types.ObjectId(userId);
  devotional.rejectionReason = '';
  devotional.rejectedAt = null;
  devotional.rejectedBy = null;
  await devotional.save();

  const populated = await Devotional.findById(devotional._id).populate(artistPopulate).lean();
  sendResponse(
    reply,
    200,
    {
      devotional: shapeDevotionalItem(
        (populated ?? devotional.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Devotional approved.'
  );
}

export async function rejectAdminDevotional(
  request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const devotional = await Devotional.findById(id);
  if (!devotional) throw new AppError('Devotional not found', 404);

  const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';
  devotional.status = 'archived';
  devotional.rejectionReason = reason;
  devotional.rejectedAt = new Date();
  devotional.rejectedBy = new mongoose.Types.ObjectId(userId);
  devotional.approvedAt = null;
  devotional.approvedBy = null;
  await devotional.save();

  const populated = await Devotional.findById(devotional._id).populate(artistPopulate).lean();
  sendResponse(
    reply,
    200,
    {
      devotional: shapeDevotionalItem(
        (populated ?? devotional.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Devotional rejected.'
  );
}
