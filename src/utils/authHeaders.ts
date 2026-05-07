import type { FastifyReply } from 'fastify';
import { ENVIRONMENT } from '../config/env';

/**
 * Writes access/refresh values onto the response token headers.
 */
export function attachAuthTokenHeaders(
  reply: FastifyReply,
  tokens: { access: string; refresh: string }
): void {
  const { access, refresh } = ENVIRONMENT.tokenNames.headers;
  void reply.header(access, tokens.access);
  void reply.header(refresh, tokens.refresh);
}
