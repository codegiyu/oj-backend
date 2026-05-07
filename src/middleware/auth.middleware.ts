import { FastifyRequest, FastifyReply } from 'fastify';
import { ENVIRONMENT } from '../config/env';
import { verifyAccessWithMeta, verifyRefresh, type TokenPayload } from '../utils/token';
import { AppError } from '../utils/AppError';
import { assertConsoleAccess } from '../utils/consoleAccess';
import { logger } from '../utils/logger';
import { setAuthCookies } from '../controllers/auth/auth.helpers';
import { rotateSessionFromRefresh } from '../utils/refreshSession';
import { attachAuthTokenHeaders } from '../utils/authHeaders';

const accessCookieName = ENVIRONMENT.tokenNames.cookies.access;
const refreshCookieName = ENVIRONMENT.tokenNames.cookies.refresh;
const accessHeaderName = ENVIRONMENT.tokenNames.headers.access;
const refreshHeaderName = ENVIRONMENT.tokenNames.headers.refresh;

function singleHeader(request: FastifyRequest, headerName: string): string | undefined {
  const key = String(headerName).toLowerCase();
  const v = request.headers[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** Header names first (Express-style), then Bearer / cookies. */
function getAccessToken(request: FastifyRequest): string | undefined {
  const fromNamedHeader = singleHeader(request, accessHeaderName);
  if (fromNamedHeader) {
    return fromNamedHeader;
  }

  const auth = request.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7);
  }

  const fromCookie = request.cookies?.[accessCookieName];
  if (fromCookie && typeof fromCookie === 'string') {
    return fromCookie;
  }

  return undefined;
}

function getRefreshToken(request: FastifyRequest): string | undefined {
  const fromNamedHeader = singleHeader(request, refreshHeaderName);
  if (fromNamedHeader) {
    return fromNamedHeader;
  }

  const fromCookie = request.cookies?.[refreshCookieName];
  if (fromCookie && typeof fromCookie === 'string') {
    return fromCookie;
  }

  return undefined;
}

function isCompleteAccessPayload(
  payload: TokenPayload | null | undefined
): payload is TokenPayload & {
  userId: string;
  email: string;
  scope: 'client-access' | 'console-access';
  jti: string;
} {
  return Boolean(
    payload &&
    payload.userId &&
    payload.email &&
    payload.scope &&
    payload.jti &&
    (payload.scope === 'client-access' || payload.scope === 'console-access')
  );
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
    refreshCookiePresent: Boolean(
      request.cookies?.[refreshCookieName] && typeof request.cookies[refreshCookieName] === 'string'
    ),
    accessHeaderPresent: Boolean(singleHeader(request, accessHeaderName)),
    refreshHeaderPresent: Boolean(singleHeader(request, refreshHeaderName)),
    bearerPresent:
      typeof request.headers.authorization === 'string' &&
      request.headers.authorization.startsWith('Bearer '),
    cookieNames: cookieKeys,
    expectedAccessCookieName: accessCookieName,
  };
}

/**
 * Resolves the session (verify access, refresh if needed, set `authUser` / `authTokens`,
 * write auth response headers, refresh cookies when tokens rotate) — same responsibilities
 * as an Express `protectRoutes` middleware in one preHandler.
 */
async function resolveSession(
  request: FastifyRequest,
  reply: FastifyReply,
  snapshot: Record<string, unknown>
): Promise<'ok' | 'no-session'> {
  const accessToken = getAccessToken(request);
  const refreshToken = getRefreshToken(request);
  const requireRefresh = ENVIRONMENT.auth.requireRefreshToken;

  if (requireRefresh) {
    if (!refreshToken) {
      logger.debug('auth: requireRefreshToken — no refresh credential', snapshot);
      return 'no-session';
    }

    const refreshPayload = verifyRefresh(refreshToken);
    if (!isCompleteAccessPayload(refreshPayload)) {
      logger.info('auth: requireRefreshToken — refresh JWT invalid', snapshot);
      return 'no-session';
    }

    if (accessToken) {
      const { payload } = verifyAccessWithMeta(accessToken);
      if (isCompleteAccessPayload(payload)) {
        request.authUser = {
          userId: String(payload.userId),
          email: payload.email,
          scope: payload.scope,
          jti: payload.jti,
        };
        request.authTokens = {
          accessToken,
          refreshToken,
        };
        attachAuthTokenHeaders(reply, { access: accessToken, refresh: refreshToken });

        logger.debug('auth: session from access token (refresh required)', {
          ...snapshot,
          userId: payload.userId,
          scope: payload.scope,
        });
        return 'ok';
      }
    }

    const rotatedStrict = await rotateSessionFromRefresh(refreshToken);

    if (!rotatedStrict) {
      logger.info('auth: requireRefreshToken — refresh rotation failed', snapshot);
      return 'no-session';
    }

    request.authUser = rotatedStrict.authUser;
    request.authTokens = {
      accessToken: rotatedStrict.accessToken,
      refreshToken: rotatedStrict.refreshToken,
    };
    setAuthCookies(reply, rotatedStrict.accessToken, rotatedStrict.refreshToken);

    logger.info('auth: session restored via refresh (requireRefreshToken)', {
      ...snapshot,
      userId: rotatedStrict.authUser.userId,
      scope: rotatedStrict.authUser.scope,
    });

    return 'ok';
  }

  if (accessToken) {
    const { payload, jwtErrorName } = verifyAccessWithMeta(accessToken);

    if (isCompleteAccessPayload(payload)) {
      request.authUser = {
        userId: String(payload.userId),
        email: payload.email,
        scope: payload.scope,
        jti: payload.jti,
      };
      request.authTokens = {
        accessToken,
        refreshToken: refreshToken ?? '',
      };
      attachAuthTokenHeaders(reply, { access: accessToken, refresh: refreshToken ?? '' });

      logger.debug('auth: session from access token', {
        ...snapshot,
        userId: payload.userId,
        scope: payload.scope,
      });

      return 'ok';
    }

    logger.debug('auth: access token not usable; attempting refresh', {
      ...snapshot,
      jwtErrorName: jwtErrorName ?? (payload ? 'incomplete_payload' : undefined),
    });
  }

  if (!refreshToken) {
    return 'no-session';
  }

  const rotated = await rotateSessionFromRefresh(refreshToken);

  if (!rotated) {
    logger.info('auth: refresh rejected (invalid, revoked, or expired)', snapshot);
    return 'no-session';
  }

  request.authUser = rotated.authUser;
  request.authTokens = {
    accessToken: rotated.accessToken,
    refreshToken: rotated.refreshToken,
  };

  setAuthCookies(reply, rotated.accessToken, rotated.refreshToken);

  logger.info('auth: session restored via refresh token', {
    ...snapshot,
    userId: rotated.authUser.userId,
    scope: rotated.authUser.scope,
  });

  return 'ok';
}

export const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const snapshot = authRequestSnapshot(request);

  const outcome = await resolveSession(request, reply, snapshot);

  if (outcome === 'ok') {
    return;
  }

  if (!getAccessToken(request) && !getRefreshToken(request)) {
    logger.info('auth: authenticate rejected (no credentials)', { snapshot });
  } else {
    logger.info('auth: authenticate rejected (invalid session)', { snapshot });
  }

  throw new AppError('NAT: Unauthorized', 401);
};

/**
 * Like authenticate but never throws. Sets request.authUser when a valid token is present;
 * leaves it undefined otherwise. Use for endpoints (e.g. GET /auth/session) that should
 * return "no session" (e.g. { user: null }) instead of 401 when not logged in.
 */
export const optionalAuthenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const snapshot = authRequestSnapshot(request);
  const outcome = await resolveSession(request, reply, snapshot);

  if (outcome === 'ok') {
    return;
  }

  logger.debug('auth: optionalAuthenticate — no valid session', snapshot);
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
