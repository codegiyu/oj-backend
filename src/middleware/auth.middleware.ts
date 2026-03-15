import { FastifyRequest, FastifyReply } from 'fastify';
import { ENVIRONMENT } from '../config/env';
import { verifyAccess } from '../utils/token';

const accessCookieName = ENVIRONMENT.tokenNames.cookies.access;

function getAccessToken(request: FastifyRequest): string | undefined {
  const fromCookie = request.cookies?.[accessCookieName];
  if (fromCookie && typeof fromCookie === 'string') return fromCookie;
  const auth = request.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return undefined;
}

export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const token = getAccessToken(request);
  if (!token) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
  const payload = verifyAccess(token);
  if (!payload || !payload.userId || !payload.email || !payload.scope || !payload.jti) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
  request.authUser = {
    userId: String(payload.userId),
    email: payload.email,
    scope: payload.scope,
    jti: payload.jti,
  };
};
