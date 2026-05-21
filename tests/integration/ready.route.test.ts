import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import * as readiness from '../../src/services/readiness.service';

describe('GET /ready', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 503 when MongoDB or Redis is not ready', async () => {
    vi.spyOn(readiness, 'getReadinessChecks').mockResolvedValue({
      mongodb: false,
      redis: false,
    });

    const response = await app.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(503);

    const body = response.json() as {
      status: string;
      checks: { mongodb: boolean; redis: boolean };
    };

    expect(body.status).toBe('not_ready');
    expect(body.checks.mongodb).toBe(false);
    expect(body.checks.redis).toBe(false);
  });

  it('returns 200 when MongoDB and Redis are ready', async () => {
    vi.spyOn(readiness, 'getReadinessChecks').mockResolvedValue({
      mongodb: true,
      redis: true,
    });

    const response = await app.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      status: string;
      checks: { mongodb: boolean; redis: boolean };
    };

    expect(body.status).toBe('ready');
    expect(body.checks.mongodb).toBe(true);
    expect(body.checks.redis).toBe(true);
  });
});
