import type { FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import { parsePositiveInteger, parseString } from '../utils/helpers';
import * as albumRepo from '../repositories/public/album.repository';
import {
  countMusicTracksForAlbum,
  listMusicTracksForAlbum,
} from '../repositories/admin/album.repository';
import { leanIdToString } from '../utils/leanId';
import { shapeAlbumDetail, shapeAlbumListItem, shapeAlbumTrackItem } from './publicAlbum.shaping';
import {
  PUBLIC_LIST_DEFAULT_LIMIT as DEFAULT_LIMIT,
  PUBLIC_LIST_MAX_LIMIT as MAX_LIMIT,
} from '../constants/pagination';

export type PublicAlbumServiceResult = {
  statusCode: number;
  data?: unknown;
  message: string;
};

export async function listPublicAlbums(
  request: FastifyRequest<{
    Querystring: {
      artist?: string;
      page?: string;
      limit?: string;
      type?: string;
    };
  }>
): Promise<PublicAlbumServiceResult> {
  const limit = parsePositiveInteger(request.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const artistId = parseString(request.query.artist);
  const type = parseString(request.query.type);

  const filter: Record<string, unknown> = { status: 'published' };

  if (artistId && mongoose.Types.ObjectId.isValid(artistId)) {
    filter.artist = new mongoose.Types.ObjectId(artistId);
  }

  let sort: Record<string, 1 | -1> = { createdAt: -1 };

  if (type === 'featured') {
    filter.isFeatured = true;
    sort = { displayOrder: 1, createdAt: -1 };
  }

  const { items, total } = await albumRepo.listPublishedAlbums({
    filter,
    sort,
    skip,
    limit,
  });

  const albums = await Promise.all(
    items.map(async item => {
      const trackCount = await countMusicTracksForAlbum(leanIdToString(item._id));

      return shapeAlbumListItem({ ...item, trackCount });
    })
  );

  return {
    statusCode: 200,
    data: {
      albums,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
    message: 'Albums list loaded.',
  };
}

export async function getPublicAlbumByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<PublicAlbumServiceResult> {
  const doc = await albumRepo.findPublishedAlbumByIdOrSlug(request.params.idOrSlug);

  if (!doc || doc.status !== 'published') {
    throw new AppError('Album not found', 404);
  }

  const populated = await albumRepo.findPublishedAlbumByIdPopulated(doc._id);

  if (!populated || populated.status !== 'published') {
    throw new AppError('Album not found', 404);
  }

  const trackRows = await listMusicTracksForAlbum(leanIdToString(populated._id), {
    publishedOnly: true,
  });
  const tracks = trackRows.map(shapeAlbumTrackItem);

  return {
    statusCode: 200,
    data: {
      album: shapeAlbumDetail({
        ...populated,
        trackCount: tracks.length,
      }),
      tracks,
    },
    message: 'Album loaded.',
  };
}
