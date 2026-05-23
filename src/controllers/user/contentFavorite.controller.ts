import type { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { getAuthUser } from '../../utils/getAuthUser';
import { parsePositiveInteger } from '../../utils/helpers';
import {
  addContentFavorite,
  listContentFavorites,
  removeContentFavorite,
} from '../../services/contentFavorite.service';

export async function listFavorites(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; entityType?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const userId = new mongoose.Types.ObjectId(auth.userId);
  const limit = parsePositiveInteger(request.query.limit, 20, 100);
  const page = parsePositiveInteger(request.query.page, 1, 1000);

  const { items, total } = await listContentFavorites({
    userId,
    page,
    limit,
    entityType: request.query.entityType,
  });

  sendResponse(
    reply,
    200,
    {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    },
    'Favorites loaded.'
  );
}

export async function addFavorite(
  request: FastifyRequest<{ Body: { entityType: string; entityId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const userId = new mongoose.Types.ObjectId(auth.userId);
  const item = await addContentFavorite({
    userId,
    entityType: request.body.entityType,
    entityId: request.body.entityId,
  });

  sendResponse(reply, 200, { item }, 'Added to favorites.');
}

export async function removeFavorite(
  request: FastifyRequest<{ Params: { entityType: string; entityId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const userId = new mongoose.Types.ObjectId(auth.userId);

  await removeContentFavorite({
    userId,
    entityType: request.params.entityType,
    entityId: request.params.entityId,
  });

  sendResponse(reply, 200, { success: true }, 'Removed from favorites.');
}
