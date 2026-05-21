import type { FastifyInstance } from 'fastify';
import { securityPlugin } from './security.plugin';
import { authPlugin } from './auth.plugin';
import { observabilityPlugin } from './observability.plugin';

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  // Register on the root instance so hooks/decorators apply to all routes (Fastify encapsulation).
  await securityPlugin(app);
  await authPlugin(app);
  await observabilityPlugin(app);
}
