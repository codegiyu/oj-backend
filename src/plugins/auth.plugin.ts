import type { FastifyInstance } from 'fastify';
import {
  authenticate,
  optionalAuthenticate,
  requireConsoleAccess,
} from '../middleware/auth.middleware';
import { wrapRootPlugin } from './wrapPlugin';

// eslint-disable-next-line @typescript-eslint/require-await
async function authPlugin(app: FastifyInstance): Promise<void> {
  app.decorate('authenticate', authenticate);
  app.decorate('optionalAuthenticate', optionalAuthenticate);
  app.decorate('requireConsoleAccess', requireConsoleAccess);
}

export const ojAuthPlugin = wrapRootPlugin(authPlugin, 'oj-auth-plugin');
