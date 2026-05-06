import { AuthUser } from '../lib/types/constants';

declare module 'fastify' {
  interface FastifyRequest {
    /** Authenticated user payload (set by our auth middleware). */
    authUser?: AuthUser;
  }
}
