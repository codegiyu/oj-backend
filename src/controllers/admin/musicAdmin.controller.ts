import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Music } from '../../models/music';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug } from '../../utils/helpers';
import { requireAdmin, parseObjectId } from './admin.helpers';
import * as adminMusicService from '../../services/adminMusic.service';
import { shapeMusicItem } from '../../services/adminMusic.service';
import {
  resolveArtistIdForAdminContent,
  applyContentOwnershipUpdate,
} from '../../services/contentOwner.service';
import {
  parseAlbumAssignmentInput,
  resolveAlbumForMusicAssignment,
} from '../../services/albumMusic.service';
import {
  assertMonetizationPrice,
  resolveMonetizationPrice,
} from '../../utils/monetizationValidation';

const artistPopulate = {
  path: 'artist' as const,
  select: '_id name slug image user',
  populate: { path: 'user', select: '_id' },
};

export async function listAdminMusic(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string; status?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await adminMusicService.listAdminMusic(request);

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminMusic(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await adminMusicService.getAdminMusic(request);

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
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
      price?: number;
      status?: 'draft' | 'published' | 'archived';
      artistId?: string;
      ownerUserId?: string;
      albumId?: string | null;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body;
  const isMonetizable = body.isMonetizable ?? false;

  assertMonetizationPrice(isMonetizable, body.price ?? 0);

  const resolvedArtistId = await resolveArtistIdForAdminContent({
    ownerUserId: body.ownerUserId,
    artistId: body.artistId,
  });
  const slugFilter = resolvedArtistId ? { artist: resolvedArtistId } : { artist: null };
  const slug = await generateUniqueSlug(Music, body.title, slugFilter);

  let albumRef: mongoose.Types.ObjectId | null = null;
  const albumAssignment = parseAlbumAssignmentInput(body.albumId);

  if (albumAssignment.action === 'set') {
    albumRef = await resolveAlbumForMusicAssignment({
      albumId: albumAssignment.albumId,
      musicArtistId: resolvedArtistId ?? null,
    });
  }

  const music = await Music.create({
    title: body.title,
    slug,
    artist: resolvedArtistId ?? null,
    album: albumRef,
    description: body.description ?? '',
    lyrics: body.lyrics ?? '',
    coverImage: body.coverImage ?? '',
    audioUrl: body.audioUrl ?? '',
    videoUrl: body.videoUrl ?? '',
    downloadUrl: body.downloadUrl ?? '',
    excerpt: body.excerpt ?? '',
    category: body.category ?? '',
    status: body.status ?? 'draft',
    isMonetizable,
    price: resolveMonetizationPrice(isMonetizable, body.price ?? 0),
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
      price?: number;
      artistId?: string;
      ownerUserId?: string;
      albumId?: string | null;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const music = await Music.findById(id);
  if (!music) throw new AppError('Music not found', 404);

  const body = request.body ?? {};
  const nextMonetizable = body.isMonetizable ?? music.isMonetizable ?? false;
  const nextPrice =
    body.price !== undefined
      ? body.price
      : body.isMonetizable !== undefined
        ? music.price
        : undefined;

  assertMonetizationPrice(nextMonetizable, nextPrice ?? music.price ?? 0);
  const newArtistId = await applyContentOwnershipUpdate(music, body, 'Music');
  if (newArtistId) music.artist = newArtistId;

  const albumAssignment = parseAlbumAssignmentInput(body.albumId);

  if (albumAssignment.action === 'clear') {
    music.album = null;
  } else if (albumAssignment.action === 'set') {
    music.album = await resolveAlbumForMusicAssignment({
      albumId: albumAssignment.albumId,
      musicArtistId: music.artist ?? null,
    });
  }

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
  if (body.price !== undefined || body.isMonetizable !== undefined) {
    music.price = resolveMonetizationPrice(nextMonetizable, nextPrice ?? music.price, music.price);
  }

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
