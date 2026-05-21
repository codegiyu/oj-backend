import type { FastifyInstance } from 'fastify';
import { ojSecurityPlugin } from './security.plugin';
import { ojAuthPlugin } from './auth.plugin';
import { ojObservabilityPlugin } from './observability.plugin';

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  await app.register(ojSecurityPlugin);
  await app.register(ojAuthPlugin);
  await app.register(ojObservabilityPlugin);
}
