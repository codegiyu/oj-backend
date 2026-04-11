import type { FastifyRequest } from 'fastify';
import type { AuthUser } from '../lib/types/constants';
import { AppError } from './AppError';
import { getAuthUser } from './getAuthUser';

/** Unauthenticated or missing user → 401; authenticated but not console → 403. */
export function assertConsoleAccess(request: FastifyRequest): { userId: string } {
  const user = getAuthUser(request);
  if (!user) throw new AppError('Unauthorized', 401);
  if (user.scope !== 'console-access') {
    throw new AppError('Access denied: admin access required', 403);
  }
  return { userId: user.userId };
}

export function hasConsoleAccess(user: AuthUser | undefined): boolean {
  return user?.scope === 'console-access';
}
