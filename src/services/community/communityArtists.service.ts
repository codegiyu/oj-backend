/**
 * Community artists public API business logic.
 */

import type { FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { parseString } from '../../utils/helpers';
import { applyTextSearch, parseListQueryParams } from '../../utils/publicListQuery';
import { resolveArtistListScope } from '../../constants/artistSections';
import {
  listActiveCommunityArtists,
  findActiveArtistByIdOrSlug,
} from '../../repositories/community/artist.repository';
import { shapeArtistListItem, shapeArtistDetail } from '../../controllers/public/community.helpers';
import { leanIdToString } from '../../utils/leanId';
import {
  getPublishedContentCountsByArtistIds,
  type ArtistPublishedContentCounts,
} from '../artistPublicStats.service';
import {
  pagination,
  resolveArtistIsFollowing,
  resolveFollowingSet,
  resolveExplicitSort,
} from './shared';

export async function listCommunityArtists(
  request: FastifyRequest<{
    Querystring?: {
      page?: string;
      limit?: string;
      rising?: string;
      featured?: string;
      spotlight?: string;
      q?: string;
      sort?: string;
    };
  }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const { page, limit, skip, q, sortPreset, mongoSort } = parseListQueryParams(request.query ?? {});
  const scope = resolveArtistListScope(request.query ?? {});
  const explicitSort = parseString(request.query?.sort);

  const textFilter = applyTextSearch({}, q, ['name', 'genre', 'bio']);
  const sort = explicitSort
    ? resolveExplicitSort(explicitSort, sortPreset, mongoSort, 'followerCount')
    : undefined;

  const { items, total } = await listActiveCommunityArtists({
    skip,
    limit,
    scope,
    filter: textFilter,
    sort,
  });

  const artistObjectIds = items
    .map(item => leanIdToString(item._id))
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));

  const [contentCounts, followingSet] = await Promise.all([
    getPublishedContentCountsByArtistIds(artistObjectIds),
    resolveFollowingSet(request, artistObjectIds),
  ]);

  const artists = items.map(item => {
    const artistId = leanIdToString(item._id);
    const stats = contentCounts.get(artistId);

    return shapeArtistListItem(item, {
      stats: { songs: stats?.songs ?? 0, videos: stats?.videos ?? 0 },
      isFollowing: followingSet?.has(artistId),
    });
  });

  return {
    statusCode: 200,
    data: { artists, pagination: pagination(page, limit, total) },
    message: 'Artists list loaded.',
  };
}

export async function getCommunityArtistByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>
): Promise<{ statusCode: number; data: unknown; message: string }> {
  const doc = await findActiveArtistByIdOrSlug(request.params.idOrSlug);
  if (!doc) throw new AppError('Artist not found', 404);

  const artistId = leanIdToString(doc._id);
  const artistObjectId = mongoose.Types.ObjectId.isValid(artistId)
    ? new mongoose.Types.ObjectId(artistId)
    : null;

  const [contentCounts, isFollowing] = await Promise.all([
    artistObjectId
      ? getPublishedContentCountsByArtistIds([artistObjectId])
      : Promise.resolve(new Map<string, ArtistPublishedContentCounts>()),
    resolveArtistIsFollowing(request, artistObjectId),
  ]);

  const stats: ArtistPublishedContentCounts | undefined = artistObjectId
    ? contentCounts.get(artistId)
    : undefined;

  return {
    statusCode: 200,
    data: {
      artist: shapeArtistDetail(doc, {
        stats: { songs: stats?.songs ?? 0, videos: stats?.videos ?? 0 },
        isFollowing,
      }),
    },
    message: 'Artist loaded.',
  };
}
