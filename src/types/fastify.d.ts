import { AuthUser } from '../lib/types/constants';

export type RequestAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

declare module 'fastify' {
  interface FastifyRequest {
    /** Authenticated user payload (set by our auth middleware). */
    authUser?: AuthUser;
    /**
     * Tokens to echo on response headers (and set when issuing a session).
     * Cleared to empty strings when cookies are cleared (e.g. logout).
     */
    authTokens?: RequestAuthTokens;
  }
}
