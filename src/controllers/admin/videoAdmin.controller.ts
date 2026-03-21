import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Video } from '../../models/video';
import { Artist } from '../../models/artist';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug, parsePositiveInteger, parseSearch, parseString, normalizeSort } from '../../utils/helpers';
import { toArtistSummary } from '../artist/artist.helpers';
import { ARTIST_POPULATE_SELECT } from '../artist/artist.helpers';
import { requireAdmin, parseObjectId } from './admin.helpers';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status'];

function shapeVideoItem(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as { _id: unknown; name?: string; slug?: string; image?: string } | null);
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    status: raw.status,
    description: raw.description,
    thumbnail: raw.thumbnail,
    videoUrl: raw.videoUrl,
    views: raw.views ?? 0,
    approvedAt: raw.approvedAt,
    rejectedAt: raw.rejectedAt,
    rejectionReason: raw.rejectionReason,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    ...(artist && { artist }),
  };
}

export async function listAdminVideos(
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
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, '-createdAt');

  const [items, total] = await Promise.all([
    Video.find(filter).sort(sortStr).populate('artist', ARTIST_POPULATE_SELECT).skip(skip).limit(limit).lean(),
    Video.countDocuments(filter),
  ]);

  const videos = (items as Record<string, unknown>[]).map(shapeVideoItem);

  sendResponse(reply, 200, {
    videos,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  }, 'Videos list loaded.');
}

export async function getAdminVideo(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const doc = await Video.findById(id).populate('artist', ARTIST_POPULATE_SELECT).lean();
  if (!doc) throw new AppError('Video not found', 404);
  const raw = doc as unknown as Record<string, unknown>;
  const video = {
    _id: String(raw._id),
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    thumbnail: raw.thumbnail,
    videoUrl: raw.videoUrl,
    category: raw.category,
    status: raw.status,
    isMonetizable: raw.isMonetizable,
    views: raw.views ?? 0,
    approvedAt: raw.approvedAt,
    approvedBy: raw.approvedBy,
    rejectionReason: raw.rejectionReason,
    rejectedAt: raw.rejectedAt,
    rejectedBy: raw.rejectedBy,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    artist: toArtistSummary(raw.artist as { _id: unknown; name?: string; slug?: string; image?: string } | null),
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
      category?: string;
      isMonetizable?: boolean;
      status?: 'draft' | 'published' | 'archived';
      artistId: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const body = request.body;
  const artistId = parseObjectId(body.artistId, 'artistId');
  const artist = await Artist.findById(artistId).lean();
  if (!artist) throw new AppError('Artist not found', 404);

  const slug = await generateUniqueSlug(Video, body.title, { artist: artistId });

  const video = await Video.create({
    title: body.title,
    slug,
    artist: artistId,
    description: body.description ?? '',
    thumbnail: body.thumbnail ?? '',
    videoUrl: body.videoUrl ?? '',
    category: body.category ?? '',
    status: body.status ?? 'draft',
    isMonetizable: body.isMonetizable ?? false,
    isFeatured: false,
    displayOrder: 0,
    views: 0,
  });

  const populated = await Video.findById(video._id).populate('artist', ARTIST_POPULATE_SELECT).lean();
  sendResponse(reply, 201, { video: shapeVideoItem((populated ?? video) as unknown as Record<string, unknown>) }, 'Video created.');
}

export async function updateAdminVideo(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      title?: string;
      description?: string;
      thumbnail?: string;
      videoUrl?: string;
      category?: string;
      status?: 'draft' | 'published' | 'archived';
      isMonetizable?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const video = await Video.findById(id);
  if (!video) throw new AppError('Video not found', 404);

  const body = request.body ?? {};
  if (body.title !== undefined) video.title = body.title;
  if (body.description !== undefined) video.description = body.description;
  if (body.thumbnail !== undefined) video.thumbnail = body.thumbnail;
  if (body.videoUrl !== undefined) video.videoUrl = body.videoUrl;
  if (body.category !== undefined) video.category = body.category;
  if (body.status !== undefined) video.status = body.status;
  if (body.isMonetizable !== undefined) video.isMonetizable = body.isMonetizable;

  await video.save();

  const populated = await Video.findById(video._id).populate('artist', ARTIST_POPULATE_SELECT).lean();
  sendResponse(reply, 200, { video: shapeVideoItem((populated ?? video.toObject()) as Record<string, unknown>) }, 'Video updated.');
}

export async function deleteAdminVideo(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
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

  const populated = await Video.findById(video._id).populate('artist', ARTIST_POPULATE_SELECT).lean();
  sendResponse(reply, 200, { video: shapeVideoItem((populated ?? video.toObject()) as Record<string, unknown>) }, 'Video approved.');
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

  const populated = await Video.findById(video._id).populate('artist', ARTIST_POPULATE_SELECT).lean();
  sendResponse(reply, 200, { video: shapeVideoItem((populated ?? video.toObject()) as Record<string, unknown>) }, 'Video rejected.');
}
