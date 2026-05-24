import type { FastifyRequest } from 'fastify';
import { AppError } from '../utils/AppError';
import { parsePositiveInteger, parseSearch, parseString, normalizeSort } from '../utils/helpers';
import { applyCategoryFilter } from './admin/adminListFilters';
import { parseObjectId } from '../controllers/admin/admin.helpers';
import { leanIdToString, toArtistSummary } from '../controllers/artist/artist.helpers';
import mongoose from 'mongoose';
import { findAdminMusicById, listAdminMusicRows } from '../repositories/admin/music.repository';
import { albumApiFieldsFromRaw } from '../utils/albumSummary';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status', 'downloads', 'plays', 'views'];

export type AdminMusicServiceResult = {
  statusCode: number;
  data: unknown;
  message: string;
};

function ownerApiFields(raw: Record<string, unknown>): {
  ownerLocked: boolean;
  ownerUserId?: string;
} {
  const artistVal = raw.artist;

  if (artistVal == null) {
    return { ownerLocked: false };
  }

  if (
    typeof artistVal === 'object' &&
    artistVal !== null &&
    (artistVal as { _id?: unknown })._id == null
  ) {
    return { ownerLocked: false };
  }

  const u =
    typeof artistVal === 'object' && artistVal !== null && 'user' in artistVal
      ? (
          artistVal as {
            user?:
              | { _id?: mongoose.Types.ObjectId | null }
              | mongoose.Types.ObjectId
              | string
              | null;
          }
        ).user
      : undefined;

  let ownerUserId: string | undefined;

  if (u != null && typeof u === 'object' && u !== null && '_id' in u) {
    const id = (u as { _id?: unknown })._id;
    ownerUserId = id != null ? leanIdToString(id) : undefined;
  } else if (u != null) {
    ownerUserId = leanIdToString(u);
  }

  return { ownerLocked: true, ...(ownerUserId ? { ownerUserId } : {}) };
}

export function shapeMusicItem(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(
    raw.artist as { _id: unknown; name?: string; slug?: string; image?: string } | null
  );
  const owner = ownerApiFields(raw);

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
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
    ...albumApiFieldsFromRaw(raw),
  };
}

export async function listAdminMusic(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
      sort?: string;
      category?: string;
    };
  }>
): Promise<AdminMusicServiceResult> {
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const limit = parsePositiveInteger(request.query.limit, 25, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  const search = parseSearch(request.query.search);
  const status = parseString(request.query.status);

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  applyCategoryFilter(filter, request.query.category);

  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, '-createdAt');
  const { items, total } = await listAdminMusicRows({ filter, sort: sortStr, skip, limit });
  const music = items.map(shapeMusicItem);

  return {
    statusCode: 200,
    data: {
      music,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    },
    message: 'Music list loaded.',
  };
}

export async function getAdminMusic(
  request: FastifyRequest<{ Params: { id: string } }>
): Promise<AdminMusicServiceResult> {
  const id = parseObjectId(request.params.id);
  const doc = await findAdminMusicById(String(id));

  if (!doc) {
    throw new AppError('Music not found', 404);
  }

  const shaped = shapeMusicItem(doc);
  const music = {
    ...shaped,
    lyrics: doc.lyrics,
    isMonetizable: doc.isMonetizable,
    price: doc.price,
    approvedAt: doc.approvedAt,
    approvedBy: doc.approvedBy,
    rejectionReason: doc.rejectionReason,
    rejectedAt: doc.rejectedAt,
    rejectedBy: doc.rejectedBy,
  };

  return { statusCode: 200, data: { music }, message: 'Music loaded.' };
}
