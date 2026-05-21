import type { FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import { leanIdToString, parseObjectId } from '../controllers/admin/admin.helpers';
import { toArtistSummary } from '../controllers/artist/artist.helpers';
import { findAdminVideoById, listAdminVideoRows } from '../repositories/admin/video.repository';
import { parseAdminListQuery } from './admin/adminListQuery';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status', 'views', 'plays', 'downloads'];

export type AdminVideoServiceResult = {
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

export function shapeVideoItem(raw: Record<string, unknown>): Record<string, unknown> {
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
    thumbnail: raw.thumbnail,
    videoUrl: raw.videoUrl,
    videoFileUrl: raw.videoFileUrl ?? '',
    embedUrl: raw.embedUrl ?? '',
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    category: raw.category ?? '',
    isFeatured: raw.isFeatured ?? false,
    isMonetizable: raw.isMonetizable ?? false,
    displayOrder: raw.displayOrder ?? 0,
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
  }>
): Promise<AdminVideoServiceResult> {
  const { page, limit, skip, filter, sort } = parseAdminListQuery(request.query, {
    sortFields: SORT_FIELDS,
    searchFields: ['title', 'description', 'slug'],
  });
  const { items, total } = await listAdminVideoRows({ filter, sort, skip, limit });
  const videos = items.map(shapeVideoItem);

  return {
    statusCode: 200,
    data: {
      videos,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    },
    message: 'Videos list loaded.',
  };
}

export async function getAdminVideo(
  request: FastifyRequest<{ Params: { id: string } }>
): Promise<AdminVideoServiceResult> {
  const id = parseObjectId(request.params.id);
  const doc = await findAdminVideoById(String(id));

  if (!doc) {
    throw new AppError('Video not found', 404);
  }

  const shaped = shapeVideoItem(doc);

  return {
    statusCode: 200,
    data: {
      video: {
        ...shaped,
        approvedBy: doc.approvedBy != null ? leanIdToString(doc.approvedBy) : doc.approvedBy,
        rejectedBy: doc.rejectedBy != null ? leanIdToString(doc.rejectedBy) : doc.rejectedBy,
      },
    },
    message: 'Video loaded.',
  };
}
