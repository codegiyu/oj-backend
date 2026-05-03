import { FastifyRequest, FastifyReply } from 'fastify';
import { ENVIRONMENT } from '../config/env';
import { verifyAccessWithMeta } from '../utils/token';
import { AppError } from '../utils/AppError';
import { assertConsoleAccess } from '../utils/consoleAccess';
import { logger } from '../utils/logger';

const accessCookieName = ENVIRONMENT.tokenNames.cookies.access;

function getAccessToken(request: FastifyRequest): string | undefined {
  const fromCookie = request.cookies?.[accessCookieName];

  if (fromCookie && typeof fromCookie === 'string') return fromCookie;

  const auth = request.headers.authorization;

  if (auth?.startsWith('Bearer ')) return auth.slice(7);

  return undefined;
}

/** Safe request context for auth logs — no cookie values, tokens, or Authorization contents. */
function authRequestSnapshot(request: FastifyRequest): Record<string, unknown> {
  const cookieKeys = request.cookies ? Object.keys(request.cookies) : [];

  return {
    method: request.method,
    url: request.url,
    routeUrl: request.routeOptions?.url,
    cookieHeaderPresent: Boolean(request.headers.cookie && request.headers.cookie.length > 0),
    accessCookiePresent: Boolean(
      request.cookies?.[accessCookieName] && typeof request.cookies[accessCookieName] === 'string'
    ),
    bearerPresent:
      typeof request.headers.authorization === 'string' &&
      request.headers.authorization.startsWith('Bearer '),
    cookieNames: cookieKeys,
    expectedAccessCookieName: accessCookieName,
  };
}

export const authenticate = async (
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> => {
  const snapshot = authRequestSnapshot(request);
  const token = getAccessToken(request);

  if (!token) {
    logger.info('auth: authenticate rejected (no access token)', JSON.stringify(snapshot, null, 2));

    throw new AppError('NAT: Unauthorized', 401);
  }

  const { payload, jwtErrorName } = verifyAccessWithMeta(token);

  if (!payload || !payload.userId || !payload.email || !payload.scope || !payload.jti) {
    logger.info(
      'auth: authenticate rejected (invalid or incomplete access token)',
      JSON.stringify(
        {
          ...snapshot,
          jwtErrorName: jwtErrorName ?? (payload ? 'incomplete_payload' : undefined),
        },
        null,
        2
      )
    );

    throw new AppError('IAT: Unauthorized', 401);
  }

  request.authUser = {
    userId: String(payload.userId),
    email: payload.email,
    scope: payload.scope,
    jti: payload.jti,
  };

  logger.debug('auth: authenticate ok', {
    ...snapshot,
    userId: payload.userId,
    scope: payload.scope,
  });
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
  const snapshot = authRequestSnapshot(request);
  const token = getAccessToken(request);

  if (!token) {
    logger.debug('auth: optionalAuthenticate — no credentials', JSON.stringify(snapshot, null, 2));
    return;
  }

  const { payload, jwtErrorName } = verifyAccessWithMeta(token);

  if (!payload || !payload.userId || !payload.email || !payload.scope || !payload.jti) {
    logger.info(
      'auth: optionalAuthenticate — credential present but not a valid session',
      JSON.stringify(
        {
          ...snapshot,
          jwtErrorName: jwtErrorName ?? (payload ? 'incomplete_payload' : undefined),
        },
        null,
        2
      )
    );
    return;
  }

  request.authUser = {
    userId: String(payload.userId),
    email: payload.email,
    scope: payload.scope,
    jti: payload.jti,
  };

  logger.debug('auth: optionalAuthenticate — session attached', {
    ...snapshot,
    userId: payload.userId,
    scope: payload.scope,
  });
};

/**
 * Run after authenticate. Ensures JWT is console (admin) scope — 401 if unauthenticated, 403 if wrong scope.
 */
export const requireConsoleAccess = async (
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> => {
  try {
    assertConsoleAccess(request);
  } catch (err) {
    if (err instanceof AppError) {
      logger.info('auth: console route rejected', {
        ...authRequestSnapshot(request),
        statusCode: err.statusCode,
        message: err.message,
        authenticatedScope: request.authUser?.scope,
      });
    }
    throw err;
  }
};
