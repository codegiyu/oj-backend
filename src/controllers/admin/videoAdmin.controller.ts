import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Video } from '../../models/video';
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
import { isLikelyYoutubeUrl } from '../../utils/videoEmbed';
import {
  resolveArtistIdForAdminContent,
  applyContentOwnershipUpdate,
} from '../../services/contentOwner.service';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status', 'views', 'plays', 'downloads'];

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

function shapeVideoItem(raw: Record<string, unknown>): Record<string, unknown> {
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
    thumbnail: raw.thumbnail,
    videoUrl: raw.videoUrl,
    videoFileUrl: raw.videoFileUrl ?? '',
    embedUrl: raw.embedUrl ?? '',
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    downloads: raw.downloads ?? 0,
    ownerLocked: owner.ownerLocked,
    ...(owner.ownerUserId ? { ownerUserId: owner.ownerUserId } : {}),
    approvedAt: raw.approvedAt,
    rejectedAt: raw.rejectedAt,
    rejectionReason: raw.rejectionReason,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    ...(artist && { artist }),
  };
}

export async function listAdminVideos(
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
    Video.find(filter).sort(sortStr).populate(artistPopulate).skip(skip).limit(limit).lean(),
    Video.countDocuments(filter),
  ]);

  const videos = (items as unknown as Record<string, unknown>[]).map(shapeVideoItem);

  sendResponse(
    reply,
    200,
    {
      videos,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    },
    'Videos list loaded.'
  );
}

export async function getAdminVideo(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const doc = await Video.findById(id).populate(artistPopulate).lean();
  if (!doc) throw new AppError('Video not found', 404);
  const raw = doc as unknown as Record<string, unknown>;
  const own = ownerApiFields(raw);
  const video = {
    _id: String(raw._id),
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    thumbnail: raw.thumbnail,
    videoUrl: raw.videoUrl,
    videoFileUrl: raw.videoFileUrl ?? '',
    embedUrl: raw.embedUrl ?? '',
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
  sendResponse(reply, 200, { video }, 'Video loaded.');
}

export async function createAdminVideo(
  request: FastifyRequest<{
    Body: {
      title: string;
      description?: string;
      thumbnail?: string;
      videoUrl?: string;
      videoFileUrl?: string;
      embedUrl?: string;
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
  const slug = await generateUniqueSlug(Video, body.title, slugFilter);

  const vf = (body.videoFileUrl ?? '').trim();
  const legacyVu = (body.videoUrl ?? '').trim();
  const embIn = (body.embedUrl ?? '').trim();
  const fileStored = vf || (legacyVu && !isLikelyYoutubeUrl(legacyVu) ? legacyVu : '');
  const embedStored = embIn || (legacyVu && isLikelyYoutubeUrl(legacyVu) ? legacyVu : '');

  const video = await Video.create({
    title: body.title,
    slug,
    artist: resolvedArtistId ?? null,
    description: body.description ?? '',
    thumbnail: body.thumbnail ?? '',
    videoFileUrl: fileStored,
    embedUrl: embedStored,
    videoUrl: fileStored || legacyVu,
    category: body.category ?? '',
    status: body.status ?? 'draft',
    isMonetizable: body.isMonetizable ?? false,
    isFeatured: false,
    displayOrder: 0,
    views: 0,
    plays: 0,
    downloads: 0,
  });

  const populated = await Video.findById(video._id).populate(artistPopulate).lean();
  sendResponse(
    reply,
    201,
    { video: shapeVideoItem((populated ?? video) as unknown as Record<string, unknown>) },
    'Video created.'
  );
}

export async function updateAdminVideo(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      title?: string;
      description?: string;
      thumbnail?: string;
      videoUrl?: string;
      videoFileUrl?: string;
      embedUrl?: string;
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
  const video = await Video.findById(id);
  if (!video) throw new AppError('Video not found', 404);

  const body = request.body ?? {};
  const newArtistId = await applyContentOwnershipUpdate(video, body, 'Video');
  if (newArtistId) video.artist = newArtistId;

  if (body.title !== undefined) video.title = body.title;
  if (body.description !== undefined) video.description = body.description;
  if (body.thumbnail !== undefined) video.thumbnail = body.thumbnail;
  if (body.embedUrl !== undefined) video.embedUrl = body.embedUrl;
  if (body.videoFileUrl !== undefined) {
    video.videoFileUrl = body.videoFileUrl;
    video.videoUrl = (body.videoFileUrl ?? '').trim() || video.videoUrl;
  }
  if (body.videoUrl !== undefined && body.videoFileUrl === undefined)
    video.videoUrl = body.videoUrl;
  if (body.category !== undefined) video.category = body.category;
  if (body.status !== undefined) video.status = body.status;
  if (body.isMonetizable !== undefined) video.isMonetizable = body.isMonetizable;

  await video.save();

  const populated = await Video.findById(video._id).populate(artistPopulate).lean();
  sendResponse(
    reply,
    200,
    { video: shapeVideoItem((populated ?? video.toObject()) as unknown as Record<string, unknown>) },
    'Video updated.'
  );
}

export async function deleteAdminVideo(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const result = await Video.findByIdAndDelete(id);
  if (!result) throw new AppError('Video not found', 404);
  sendResponse(reply, 200, { success: true }, 'Video deleted.');
}

export async function approveAdminVideo(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const video = await Video.findById(id);
  if (!video) throw new AppError('Video not found', 404);

  video.status = 'published';
  video.approvedAt = new Date();
  video.approvedBy = new mongoose.Types.ObjectId(userId);
  video.rejectionReason = '';
  video.rejectedAt = null;
  video.rejectedBy = null;
  await video.save();

  const populated = await Video.findById(video._id).populate(artistPopulate).lean();
  sendResponse(
    reply,
    200,
    { video: shapeVideoItem((populated ?? video.toObject()) as unknown as Record<string, unknown>) },
    'Video approved.'
  );
}

export async function rejectAdminVideo(
  request: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const video = await Video.findById(id);
  if (!video) throw new AppError('Video not found', 404);

  const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';
  video.status = 'archived';
  video.rejectionReason = reason;
  video.rejectedAt = new Date();
  video.rejectedBy = new mongoose.Types.ObjectId(userId);
  video.approvedAt = null;
  video.approvedBy = null;
  await video.save();

  const populated = await Video.findById(video._id).populate(artistPopulate).lean();
  sendResponse(
    reply,
    200,
    { video: shapeVideoItem((populated ?? video.toObject()) as unknown as Record<string, unknown>) },
    'Video rejected.'
  );
}
