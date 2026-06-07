import type { FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import { parseString } from '../utils/helpers';
import {
  applyTextSearch,
  parseListQueryParams,
  resolveListSortOptions,
  withPopularSortField,
} from '../utils/publicListQuery';
import * as albumRepo from '../repositories/public/album.repository';
import {
  countMusicTracksForAlbum,
  listMusicTracksForAlbum,
} from '../repositories/admin/album.repository';
import { leanIdToString } from '../utils/leanId';
import { shapeAlbumDetail, shapeAlbumListItem, shapeAlbumTrackItem } from './publicAlbum.shaping';

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
      q?: string;
      sort?: string;
    };
  }>
): Promise<PublicAlbumServiceResult> {
  const { page, limit, skip, q, sortPreset } = parseListQueryParams(request.query);
  const artistId = parseString(request.query.artist);
  const type = parseString(request.query.type);
  const explicitSort = parseString(request.query.sort);

  const filter: Record<string, unknown> = { status: 'published' };

  if (artistId && mongoose.Types.ObjectId.isValid(artistId)) {
    filter.artist = new mongoose.Types.ObjectId(artistId);
  }

  let sort: Record<string, 1 | -1> = { createdAt: -1 };

  if (explicitSort) {
    const resolved = resolveListSortOptions(explicitSort);
    sort = sortPreset === 'popular' ? withPopularSortField(resolved.sort, 'plays') : resolved.sort;
    if (resolved.featuredFilter) {
      filter.isFeatured = true;
    }
  } else if (type === 'featured') {
    filter.isFeatured = true;
    sort = { displayOrder: 1, createdAt: -1 };
  }

  const searchFilter = applyTextSearch(filter, q, ['title', 'excerpt']);

  const { items, total } = await albumRepo.listPublishedAlbums({
    filter: searchFilter,
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
