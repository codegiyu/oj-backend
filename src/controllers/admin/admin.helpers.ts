import type { FastifyRequest } from 'fastify';
import { AppError } from '../../utils/AppError';
import { assertConsoleAccess } from '../../utils/consoleAccess';
import mongoose from 'mongoose';

/** Same as route-level requireConsoleAccess after authenticate; use for userId or defense in depth. */
export function requireAdmin(request: FastifyRequest): { userId: string } {
  return assertConsoleAccess(request);
}

export function parseObjectId(id: string | undefined, field = 'id'): mongoose.Types.ObjectId {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${field}`, 400);
  }
  return new mongoose.Types.ObjectId(id);
}
