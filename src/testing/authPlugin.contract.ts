import type { FastifyInstance } from 'fastify';
import { expect } from 'vitest';

/** Used by integration tests; lives in src so Fastify module augmentation applies. */
export function expectAuthDecoratorsOnApp(app: FastifyInstance): void {
  expect(typeof app.authenticate).toBe('function');
  expect(typeof app.optionalAuthenticate).toBe('function');
  expect(typeof app.requireConsoleAccess).toBe('function');
}
