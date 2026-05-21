import type { FastifyInstance } from 'fastify';
import {
  authenticate,
  optionalAuthenticate,
  requireConsoleAccess,
} from '../middleware/auth.middleware';

// eslint-disable-next-line @typescript-eslint/require-await
export async function authPlugin(app: FastifyInstance): Promise<void> {
  app.decorate('authenticate', authenticate);
  app.decorate('optionalAuthenticate', optionalAuthenticate);
  app.decorate('requireConsoleAccess', requireConsoleAccess);
}
