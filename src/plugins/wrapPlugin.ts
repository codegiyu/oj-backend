import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

type RootPlugin = (app: FastifyInstance) => Promise<void>;

/** Registers a plugin on the root context (hooks/decorators apply to all routes). */
export function wrapRootPlugin(plugin: RootPlugin, name: string): ReturnType<typeof fp> {
  return fp(plugin as never, { name });
}
