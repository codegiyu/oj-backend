import type { AuthUser } from '../lib/types/constants';
import type {
  authenticate,
  optionalAuthenticate,
  requireConsoleAccess,
} from '../middleware/auth.middleware';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
    authTokens?: { accessToken: string; refreshToken: string };
  }

  interface FastifyInstance {
    authenticate: typeof authenticate;
    optionalAuthenticate: typeof optionalAuthenticate;
    requireConsoleAccess: typeof requireConsoleAccess;
  }
}
