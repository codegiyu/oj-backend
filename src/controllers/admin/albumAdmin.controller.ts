import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug } from '../../utils/helpers';
import { leanIdToString, requireAdmin, parseObjectId } from './admin.helpers';
import { runAdminList } from '../../services/admin/runAdminListGet';
import {
  listAdminAlbumRows,
  findAdminAlbumById,
  countMusicTracksForAlbum,
  listMusicTracksForAlbum,
  albumMongooseModel,
  createAlbumDoc,
  findAlbumDocumentById,
  findAlbumPopulatedLean,
  deleteAlbumDocumentById,
} from '../../repositories/admin/album.repository';
import { toArtistSummary } from '../artist/artist.helpers';
import { resolveArtistIdForAdminContent } from '../../services/contentOwner.service';
import { clearMusicAlbumReferences } from '../../services/albumMusic.service';
import { shapeAlbumTrackItem } from '../../services/publicAlbum.shaping';

function shapeAlbumItem(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(
    raw.artist as { _id: unknown; name?: string; slug?: string; image?: string } | null
  );

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    coverImage: raw.coverImage ?? '',
    excerpt: raw.excerpt ?? '',
    description: raw.description ?? '',
    releaseDate:
      raw.releaseDate instanceof Date ? raw.releaseDate.toISOString() : (raw.releaseDate ?? null),
    status: raw.status,
    isFeatured: Boolean(raw.isFeatured),
    displayOrder: raw.displayOrder ?? 0,
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    trackCount: raw.trackCount ?? 0,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    ...(artist && { artist }),
  };
}

async function shapeAlbumItemWithTrackCount(
  raw: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const shaped = shapeAlbumItem(raw);
  const trackCount = await countMusicTracksForAlbum(String(raw._id));

  return { ...shaped, trackCount };
}

export async function listAdminAlbums(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
      sort?: string;
      artist?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: ['createdAt', 'updatedAt', 'title', 'status', 'releaseDate', 'views', 'plays'],
    searchFields: ['title', 'description', 'excerpt', 'slug'],
    extendFilter: (filter, query) => {
      const artistId = query.artist?.trim();

      if (artistId && mongoose.Types.ObjectId.isValid(artistId)) {
        filter.artist = new mongoose.Types.ObjectId(artistId);
      }
    },
    listRows: listAdminAlbumRows,
    shapeItem: shapeAlbumItem,
    collectionKey: 'albums',
    message: 'Albums list loaded.',
  });

  const data = result.data as { albums?: Record<string, unknown>[]; pagination?: unknown };
  const albums = data.albums ?? [];
  const withCounts = await Promise.all(albums.map(row => shapeAlbumItemWithTrackCount(row)));

  sendResponse(
    reply,
    result.statusCode,
    { albums: withCounts, pagination: data.pagination },
    result.message
  );
}

export async function getAdminAlbum(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const doc = await findAdminAlbumById(String(id));

  if (!doc) {
    throw new AppError('Album not found', 404);
  }

  const trackRows = await listMusicTracksForAlbum(leanIdToString(doc._id));
  const tracks = trackRows.map(shapeAlbumTrackItem);
  const album = await shapeAlbumItemWithTrackCount(doc);

  sendResponse(reply, 200, { album: { ...album, tracks } }, 'Album loaded.');
}

export async function createAdminAlbum(
  request: FastifyRequest<{
    Body: {
      title: string;
      description?: string;
      excerpt?: string;
      coverImage?: string;
      releaseDate?: string | Date;
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

  if (!body?.title?.trim()) {
    throw new AppError('Title is required', 400);
  }

  const resolvedArtistId = await resolveArtistIdForAdminContent({
    ownerUserId: body.ownerUserId,
    artistId: body.artistId,
  });
  const slugFilter = resolvedArtistId ? { artist: resolvedArtistId } : { artist: null };
  const slug = await generateUniqueSlug(albumMongooseModel, body.title.trim(), slugFilter);

  const album = await createAlbumDoc({
    title: body.title.trim(),
    slug,
    artist: resolvedArtistId ?? null,
    description: body.description ?? '',
    excerpt: body.excerpt ?? '',
    coverImage: body.coverImage ?? '',
    releaseDate: body.releaseDate ? new Date(body.releaseDate) : null,
    status: body.status ?? 'draft',
    isFeatured: body.isFeatured ?? false,
    displayOrder: body.displayOrder ?? 0,
    views: 0,
    plays: 0,
  });

  const populated = await findAlbumPopulatedLean(album._id);
  const shaped = await shapeAlbumItemWithTrackCount(
    (populated ?? album.toObject()) as unknown as Record<string, unknown>
  );

  sendResponse(reply, 201, { album: shaped }, 'Album created.');
}

export async function updateAdminAlbum(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      title?: string;
      description?: string;
      excerpt?: string;
      coverImage?: string;
      releaseDate?: string | Date | null;
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
  const album = await findAlbumDocumentById(id);

  if (!album) {
    throw new AppError('Album not found', 404);
  }

  const body = request.body ?? {};

  if (body.ownerUserId !== undefined || body.artistId !== undefined) {
    const resolvedArtistId = await resolveArtistIdForAdminContent({
      ownerUserId: body.ownerUserId,
      artistId: body.artistId,
    });

    if (resolvedArtistId) {
      album.artist = resolvedArtistId;
    }
  }

  if (body.title !== undefined) album.title = body.title;
  if (body.description !== undefined) album.description = body.description;
  if (body.excerpt !== undefined) album.excerpt = body.excerpt;
  if (body.coverImage !== undefined) album.coverImage = body.coverImage;
  if (body.releaseDate !== undefined) {
    album.releaseDate = body.releaseDate ? new Date(body.releaseDate) : null;
  }
  if (body.status !== undefined) album.status = body.status;
  if (body.isFeatured !== undefined) album.isFeatured = body.isFeatured;
  if (body.displayOrder !== undefined) album.displayOrder = body.displayOrder;

  await album.save();

  const populated = await findAlbumPopulatedLean(album._id);
  const shaped = await shapeAlbumItemWithTrackCount(
    (populated ?? album.toObject()) as unknown as Record<string, unknown>
  );

  sendResponse(reply, 200, { album: shaped }, 'Album updated.');
}

export async function deleteAdminAlbum(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const result = await deleteAlbumDocumentById(id);

  if (!result) {
    throw new AppError('Album not found', 404);
  }

  await clearMusicAlbumReferences(id);
  sendResponse(reply, 200, { success: true }, 'Album deleted.');
}
