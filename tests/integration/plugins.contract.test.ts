import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import { expectAuthDecoratorsOnApp } from '../../src/testing/authPlugin.contract';

describe('Fastify plugins', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('decorates auth helpers on the app instance', () => {
    expectAuthDecoratorsOnApp(app);
  });

  it('applies helmet security headers on responses', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('echoes inbound x-request-id on responses', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'test-req-123' },
    });

    expect(response.statusCode).toBe(200);

    expect(response.headers['x-request-id']).toBe('test-req-123');
  });
});
