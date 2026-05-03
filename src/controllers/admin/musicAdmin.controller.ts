import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Music } from '../../models/music';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import {
  generateUniqueSlug,
  parsePositiveInteger,
  parseSearch,
  parseString,
  normalizeSort,
} from '../../utils/helpers';
import { toArtistSummary } from '../artist/artist.helpers';
import { requireAdmin, parseObjectId } from './admin.helpers';
import {
  resolveArtistIdForAdminContent,
  applyContentOwnershipUpdate,
} from '../../services/contentOwner.service';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status', 'downloads', 'plays', 'views'];

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
    (artistVal as { _id?: unknown })._id == null
  ) {
    return { ownerLocked: false };
  }
  const u =
    typeof artistVal === 'object' && artistVal !== null && 'user' in artistVal
      ? (artistVal as { user?: { _id?: unknown } | unknown }).user
      : undefined;
  let ownerUserId: string | undefined;
  if (u != null && typeof u === 'object' && u !== null && '_id' in u) {
    ownerUserId = String((u as { _id: unknown })._id);
  } else if (u != null && mongoose.Types.ObjectId.isValid(String(u))) {
    ownerUserId = String(u);
  }
  return { ownerLocked: true, ...(ownerUserId ? { ownerUserId } : {}) };
}

function shapeMusicItem(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(
    raw.artist as { _id: unknown; name?: string; slug?: string; image?: string } | null
  );
  const owner = ownerApiFields(raw);
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    status: raw.status,
    description: raw.description,
    coverImage: raw.coverImage,
    audioUrl: raw.audioUrl,
    videoUrl: raw.videoUrl,
    downloadUrl: raw.downloadUrl ?? '',
    excerpt: raw.excerpt ?? '',
    category: raw.category,
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    downloads: raw.downloads ?? 0,
    approvedAt: raw.approvedAt,
    rejectedAt: raw.rejectedAt,
    rejectionReason: raw.rejectionReason,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    ownerLocked: owner.ownerLocked,
    ...(owner.ownerUserId ? { ownerUserId: owner.ownerUserId } : {}),
    ...(artist && { artist }),
  };
}

export async function listAdminMusic(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string; status?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
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
      { description: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, '-createdAt');

  const [items, total] = await Promise.all([
    Music.find(filter).sort(sortStr).populate(artistPopulate).skip(skip).limit(limit).lean(),
    Music.countDocuments(filter),
  ]);

  const music = (items as unknown as Record<string, unknown>[]).map(shapeMusicItem);

  sendResponse(
    reply,
    200,
    {
      music,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    },
    'Music list loaded.'
  );
}

export async function getAdminMusic(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const doc = await Music.findById(id).populate(artistPopulate).lean();
  if (!doc) throw new AppError('Music not found', 404);
  const raw = doc as unknown as Record<string, unknown>;
  const own = ownerApiFields(raw);
  const music = {
    _id: String(raw._id),
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    lyrics: raw.lyrics,
    coverImage: raw.coverImage,
    audioUrl: raw.audioUrl,
    videoUrl: raw.videoUrl,
    downloadUrl: raw.downloadUrl ?? '',
    excerpt: raw.excerpt ?? '',
    category: raw.category,
    status: raw.status,
    isMonetizable: raw.isMonetizable,
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    downloads: raw.downloads ?? 0,
    ownerLocked: own.ownerLocked,
    ...(own.ownerUserId ? { ownerUserId: own.ownerUserId } : {}),
    approvedAt: raw.approvedAt,
    approvedBy: raw.approvedBy,
    rejectionReason: raw.rejectionReason,
    rejectedAt: raw.rejectedAt,
    rejectedBy: raw.rejectedBy,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    artist: toArtistSummary(
      raw.artist as { _id: unknown; name?: string; slug?: string; image?: string } | null
    ),
  };
  sendResponse(reply, 200, { music }, 'Music loaded.');
}

export async function createAdminMusic(
  request: FastifyRequest<{
    Body: {
      title: string;
      description?: string;
      lyrics?: string;
      coverImage?: string;
      audioUrl?: string;
      videoUrl?: string;
      downloadUrl?: string;
      excerpt?: string;
      category?: string;
      isMonetizable?: boolean;
      status?: 'draft' | 'published' | 'archived';
      artistId?: string;
      ownerUserId?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body;
  const resolvedArtistId = await resolveArtistIdForAdminContent({
    ownerUserId: body.ownerUserId,
    artistId: body.artistId,
  });
  const slugFilter = resolvedArtistId ? { artist: resolvedArtistId } : { artist: null };
  const slug = await generateUniqueSlug(Music, body.title, slugFilter);

  const music = await Music.create({
    title: body.title,
    slug,
    artist: resolvedArtistId ?? null,
    description: body.description ?? '',
    lyrics: body.lyrics ?? '',
    coverImage: body.coverImage ?? '',
    audioUrl: body.audioUrl ?? '',
    videoUrl: body.videoUrl ?? '',
    downloadUrl: body.downloadUrl ?? '',
    excerpt: body.excerpt ?? '',
    category: body.category ?? '',
    status: body.status ?? 'draft',
    isMonetizable: body.isMonetizable ?? false,
    isFeatured: false,
    displayOrder: 0,
    views: 0,
    plays: 0,
    downloads: 0,
  });

  const populated = await Music.findById(music._id).populate(artistPopulate).lean();
  const payload = shapeMusicItem((populated ?? music) as unknown as Record<string, unknown>);
  sendResponse(reply, 201, { music: payload }, 'Music created.');
}

export async function updateAdminMusic(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      title?: string;
      description?: string;
      lyrics?: string;
      coverImage?: string;
      audioUrl?: string;
      videoUrl?: string;
      downloadUrl?: string;
      excerpt?: string;
      category?: string;
      status?: 'draft' | 'published' | 'archived';
      isMonetizable?: boolean;
      artistId?: string;
      ownerUserId?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const music = await Music.findById(id);
  if (!music) throw new AppError('Music not found', 404);

  const body = request.body ?? {};
  const newArtistId = await applyContentOwnershipUpdate(music, body, 'Music');
  if (newArtistId) music.artist = newArtistId;

  if (body.title !== undefined) music.title = body.title;
  if (body.description !== undefined) music.description = body.description;
  if (body.lyrics !== undefined) music.lyrics = body.lyrics;
  if (body.coverImage !== undefined) music.coverImage = body.coverImage;
  if (body.audioUrl !== undefined) music.audioUrl = body.audioUrl;
  if (body.videoUrl !== undefined) music.videoUrl = body.videoUrl;
  if (body.downloadUrl !== undefined) music.downloadUrl = body.downloadUrl;
  if (body.excerpt !== undefined) music.excerpt = body.excerpt;
  if (body.category !== undefined) music.category = body.category;
  if (body.status !== undefined) music.status = body.status;
  if (body.isMonetizable !== undefined) music.isMonetizable = body.isMonetizable;

  await music.save();

  const populated = await Music.findById(music._id).populate(artistPopulate).lean();
  sendResponse(
    reply,
    200,
    {
      music: shapeMusicItem((populated ?? music.toObject()) as unknown as Record<string, unknown>),
    },
    'Music updated.'
  );
}

export async function deleteAdminMusic(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const result = await Music.findByIdAndDelete(id);
  if (!result) throw new AppError('Music not found', 404);
  sendResponse(reply, 200, { success: true }, 'Music deleted.');
}

export async function approveAdminMusic(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const music = await Music.findById(id);
  if (!music) throw new AppError('Music not found', 404);

  music.status = 'published';
  music.approvedAt = new Date();
  music.approvedBy = new mongoose.Types.ObjectId(userId);
  music.rejectionReason = '';
  music.rejectedAt = null;
  music.rejectedBy = null;
  await music.save();

  const populated = await Music.findById(music._id).populate(artistPopulate).lean();
  sendResponse(
    reply,
    200,
    {
      music: shapeMusicItem((populated ?? music.toObject()) as unknown as Record<string, unknown>),
    },
    'Music approved.'
  );
}

export async function rejectAdminMusic(
  request: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const music = await Music.findById(id);
  if (!music) throw new AppError('Music not found', 404);

  const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';
  music.status = 'archived';
  music.rejectionReason = reason;
  music.rejectedAt = new Date();
  music.rejectedBy = new mongoose.Types.ObjectId(userId);
  music.approvedAt = null;
  music.approvedBy = null;
  await music.save();

  const populated = await Music.findById(music._id).populate(artistPopulate).lean();
  sendResponse(
    reply,
    200,
    {
      music: shapeMusicItem((populated ?? music.toObject()) as unknown as Record<string, unknown>),
    },
    'Music rejected.'
  );
}
