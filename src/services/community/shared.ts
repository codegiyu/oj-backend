/**
 * Shared helpers for community public API services.
 */

import type { FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import { withPopularSortField } from '../../utils/publicListQuery';
import { getAuthUser } from '../../utils/getAuthUser';
import { isUserFollowingArtist, listFollowedArtistIdSet } from '../artistFollow.service';

export function pagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export const DEVOTIONAL_SORT_TYPES = new Set(['latest', 'popular']);

export const DEFAULT_NEWEST_SORT: Record<string, 1 | -1> = { createdAt: -1 };
export const DEFAULT_RESOURCE_LIST_SORT: Record<string, 1 | -1> = {
  displayOrder: 1,
  createdAt: -1,
};

export function resolveExplicitSort(
  explicitSort: string | undefined,
  sortPreset: 'newest' | 'popular' | 'featured',
  mongoSort: Record<string, 1 | -1>,
  popularField: string
): Record<string, 1 | -1> {
  if (!explicitSort) {
    return DEFAULT_NEWEST_SORT;
  }

  if (sortPreset === 'popular') {
    return withPopularSortField(mongoSort, popularField);
  }

  return { ...mongoSort };
}

/** Get voter identifier for poll vote (cookie, header, or IP+UA). */
function getVoterIdentifier(request: FastifyRequest): string {
  const cookies = request.cookies as { voter_id?: string } | undefined;
  const header = request.headers['x-voter-id'];
  if (cookies?.voter_id) return cookies.voter_id;
  if (typeof header === 'string' && header.trim()) return header.trim();
  const ip = request.ip ?? '';
  const ua = request.headers['user-agent'] ?? '';
  return `${ip}-${ua}`.slice(0, 200);
}

/** Prefer authenticated user id for dedupe; fall back to session voter id. */
export function getSolidarityIdentifier(request: FastifyRequest): string {
  const auth = getAuthUser(request);
  if (auth?.userId) return `user:${auth.userId}`;

  return getVoterIdentifier(request);
}

function getClientUserObjectId(request: FastifyRequest): mongoose.Types.ObjectId | null {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access' || !auth.userId) return null;
  if (!mongoose.Types.ObjectId.isValid(auth.userId)) return null;

  return new mongoose.Types.ObjectId(auth.userId);
}

export async function resolveFollowingSet(
  request: FastifyRequest,
  artistIds: mongoose.Types.ObjectId[]
): Promise<Set<string> | undefined> {
  const userId = getClientUserObjectId(request);
  if (!userId || artistIds.length === 0) return undefined;

  return listFollowedArtistIdSet(userId, artistIds);
}

export async function resolveArtistIsFollowing(
  request: FastifyRequest,
  artistId: mongoose.Types.ObjectId | null
): Promise<boolean | undefined> {
  const userId = getClientUserObjectId(request);
  if (!userId || !artistId) return undefined;

  return isUserFollowingArtist(userId, artistId);
}

export function buildCategoryCounts(
  items: Array<{ category?: string | null }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (item.category) {
      counts[item.category] = (counts[item.category] ?? 0) + 1;
    }
  }
  return counts;
}
