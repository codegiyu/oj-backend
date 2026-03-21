import type { FastifyRequest } from 'fastify';
import { AppError } from '../../utils/AppError';
import { getAuthUser } from '../../utils/getAuthUser';
import mongoose from 'mongoose';

export function requireAdmin(request: FastifyRequest): { userId: string } {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'console-access') {
    throw new AppError('Access denied: admin access required', 403);
  }
  return { userId: user.userId };
}

export function parseObjectId(id: string | undefined, field = 'id'): mongoose.Types.ObjectId {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${field}`, 400);
  }
  return new mongoose.Types.ObjectId(id);
}
