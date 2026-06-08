import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { AUTH_SENSITIVE_RATE_LIMIT } from '../../src/constants/authRateLimit';

describe('auth sensitive rate limit', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();

    await app.register(async authApp => {
      await authApp.register(rateLimit, AUTH_SENSITIVE_RATE_LIMIT);

      authApp.post('/login', async () => ({ success: true }));
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 after five attempts from the same IP within ten minutes', async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/login',
        remoteAddress: '203.0.113.50',
      });

      expect(response.statusCode).toBe(200);
    }

    const blocked = await app.inject({
      method: 'POST',
      url: '/login',
      remoteAddress: '203.0.113.50',
    });

    expect(blocked.statusCode).toBe(429);

    const body = blocked.json() as { success?: boolean; message?: string; responseCode?: number };

    expect(body.success).toBe(false);
    expect(String(body.message ?? '')).toMatch(/too many attempts/i);
    expect(body.responseCode).toBe(429);
  });
});
