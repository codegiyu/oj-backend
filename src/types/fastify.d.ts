import { AuthUser } from '../lib/types/constants';
import type { AccessScope } from '../utils/token';

declare module 'fastify' {
  interface FastifyRequest {
    /** Authenticated user payload (set by our auth middleware). */
    authUser?: AuthUser;
  }
}
