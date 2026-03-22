import { FastifyRequest, FastifyReply } from 'fastify';
import { ENVIRONMENT } from '../config/env';
import { verifyAccess } from '../utils/token';
import { AppError } from '../utils/AppError';

const accessCookieName = ENVIRONMENT.tokenNames.cookies.access;

function getAccessToken(request: FastifyRequest): string | undefined {
  console.log('accessCookieName', accessCookieName);
  console.log('request.cookies', request.cookies);
  const fromCookie = request.cookies?.[accessCookieName];
  if (fromCookie && typeof fromCookie === 'string') return fromCookie;
  const auth = request.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return undefined;
}

export const authenticate = async (
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> => {
  const token = getAccessToken(request);
  if (!token) throw new AppError('Unauthorized', 401);
  const payload = verifyAccess(token);
  if (!payload || !payload.userId || !payload.email || !payload.scope || !payload.jti) {
    throw new AppError('Unauthorized', 401);
  }
  request.authUser = {
    userId: String(payload.userId),
    email: payload.email,
    scope: payload.scope,
    jti: payload.jti,
  };
};

/**
 * Like authenticate but never throws. Sets request.authUser when a valid token is present;
 * leaves it undefined otherwise. Use for endpoints (e.g. GET /auth/session) that should
 * return "no session" (e.g. { user: null }) instead of 401 when not logged in.
 */
export const optionalAuthenticate = async (
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> => {
  const token = getAccessToken(request);
  console.log('token', token);
  if (!token) return;
  const payload = verifyAccess(token);
  console.log('payload', payload);
  if (!payload || !payload.userId || !payload.email || !payload.scope || !payload.jti) {
    return;
  }
  request.authUser = {
    userId: String(payload.userId),
    email: payload.email,
    scope: payload.scope,
    jti: payload.jti,
  };
};
