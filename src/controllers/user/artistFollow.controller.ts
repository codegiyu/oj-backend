import type { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { getAuthUser } from '../../utils/getAuthUser';
import { parsePositiveInteger } from '../../utils/helpers';
import { followArtist, listUserFollows, unfollowArtist } from '../../services/artistFollow.service';

export async function listArtistFollows(
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const userId = new mongoose.Types.ObjectId(auth.userId);
  const limit = parsePositiveInteger(request.query.limit, 20, 100);
  const page = parsePositiveInteger(request.query.page, 1, 1000);

  const { items, total } = await listUserFollows({ userId, page, limit });

  sendResponse(
    reply,
    200,
    {
      follows: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    },
    'Artist follows loaded.'
  );
}

export async function followArtistRoute(
  request: FastifyRequest<{ Params: { artistId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const userId = new mongoose.Types.ObjectId(auth.userId);
  const follow = await followArtist({ userId, artistId: request.params.artistId });

  sendResponse(reply, 200, { follow }, 'Artist followed.');
}

export async function unfollowArtistRoute(
  request: FastifyRequest<{ Params: { artistId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const userId = new mongoose.Types.ObjectId(auth.userId);

  await unfollowArtist({ userId, artistId: request.params.artistId });

  sendResponse(reply, 200, { success: true }, 'Artist unfollowed.');
}
