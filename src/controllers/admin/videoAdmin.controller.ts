import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Video } from '../../models/video';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug } from '../../utils/helpers';
import { requireAdmin, parseObjectId } from './admin.helpers';
import { isLikelyYoutubeUrl } from '../../utils/videoEmbed';
import * as adminVideoService from '../../services/adminVideo.service';
import { shapeVideoItem } from '../../services/adminVideo.service';
import {
  resolveArtistIdForAdminContent,
  applyContentOwnershipUpdate,
} from '../../services/contentOwner.service';
import {
  assertMonetizationPrice,
  resolveMonetizationPrice,
} from '../../utils/monetizationValidation';
import {
  assertMediaMetadata,
  assertPublishableContentTaxonomy,
  normalizeTags,
} from '../../utils/contentTaxonomyValidation';
import {
  enqueueMediaMetadataProbe,
  shouldEnqueueMetadataProbe,
} from '../../utils/mediaMetadataEnqueue';

const artistPopulate = {
  path: 'artist' as const,
  select: '_id name slug image user',
  populate: { path: 'user', select: '_id' },
};

export async function listAdminVideos(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string; status?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await adminVideoService.listAdminVideos(request);

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminVideo(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await adminVideoService.getAdminVideo(request);

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
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
      tags?: string[];
      metadata?: Record<string, unknown>;
      isMonetizable?: boolean;
      price?: number;
      status?: 'draft' | 'published' | 'archived';
      artistId?: string;
      ownerUserId?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body;
  const status = body.status ?? 'draft';
  const category = body.category ?? '';
  const tags = normalizeTags(body.tags) ?? [];
  const metadata = assertMediaMetadata(body.metadata);
  const isMonetizable = body.isMonetizable ?? false;

  assertMonetizationPrice(isMonetizable, body.price ?? 0);

  await assertPublishableContentTaxonomy({
    scope: 'video',
    category,
    tags,
    status,
  });

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
    category,
    tags,
    metadata,
    status,
    isMonetizable,
    price: resolveMonetizationPrice(isMonetizable, body.price ?? 0),
    isFeatured: false,
    displayOrder: 0,
    views: 0,
    plays: 0,
    downloads: 0,
  });

  const populated = await Video.findById(video._id).populate(artistPopulate).lean();
  const videoId = String(video._id);
  const probeUrl = fileStored || (legacyVu && !isLikelyYoutubeUrl(legacyVu) ? legacyVu : '');

  if (shouldEnqueueMetadataProbe('', probeUrl)) {
    void enqueueMediaMetadataProbe({
      entityType: 'video',
      entityId: videoId,
      mediaUrl: probeUrl,
      mediaKind: 'video',
    });
  }

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
      tags?: string[];
      metadata?: Record<string, unknown>;
      status?: 'draft' | 'published' | 'archived';
      isMonetizable?: boolean;
      price?: number;
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
  const prevVideoFileUrl = video.videoFileUrl;
  const prevVideoUrl = video.videoUrl;
  const nextMonetizable = body.isMonetizable ?? video.isMonetizable ?? false;
  const nextPrice =
    body.price !== undefined
      ? body.price
      : body.isMonetizable !== undefined
        ? video.price
        : undefined;

  assertMonetizationPrice(nextMonetizable, nextPrice ?? video.price ?? 0);
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
  if (body.tags !== undefined) video.tags = normalizeTags(body.tags) ?? [];
  if (body.metadata !== undefined) video.metadata = assertMediaMetadata(body.metadata);
  if (body.status !== undefined) video.status = body.status;
  if (body.isMonetizable !== undefined) video.isMonetizable = body.isMonetizable;
  if (body.price !== undefined || body.isMonetizable !== undefined) {
    video.price = resolveMonetizationPrice(nextMonetizable, nextPrice ?? video.price, video.price);
  }

  await assertPublishableContentTaxonomy({
    scope: 'video',
    category: video.category,
    tags: video.tags,
    status: video.status,
  });

  await video.save();

  const videoId = String(video._id);

  if (
    body.videoFileUrl !== undefined &&
    shouldEnqueueMetadataProbe(prevVideoFileUrl, body.videoFileUrl)
  ) {
    void enqueueMediaMetadataProbe({
      entityType: 'video',
      entityId: videoId,
      mediaUrl: video.videoFileUrl ?? '',
      mediaKind: 'video',
    });
  } else if (
    body.videoUrl !== undefined &&
    body.videoFileUrl === undefined &&
    shouldEnqueueMetadataProbe(prevVideoUrl, body.videoUrl)
  ) {
    void enqueueMediaMetadataProbe({
      entityType: 'video',
      entityId: videoId,
      mediaUrl: body.videoUrl,
      mediaKind: 'video',
    });
  }

  const populated = await Video.findById(video._id).populate(artistPopulate).lean();
  sendResponse(
    reply,
    200,
    {
      video: shapeVideoItem((populated ?? video.toObject()) as unknown as Record<string, unknown>),
    },
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
    {
      video: shapeVideoItem((populated ?? video.toObject()) as unknown as Record<string, unknown>),
    },
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
    {
      video: shapeVideoItem((populated ?? video.toObject()) as unknown as Record<string, unknown>),
    },
    'Video rejected.'
  );
}
