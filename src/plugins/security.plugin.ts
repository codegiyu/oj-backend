import type { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { ENVIRONMENT } from '../config/env';
import { getRedisClient } from '../config/redis';

function tokenHeaderAllowlist(): string[] {
  return [
    ...new Set([
      ENVIRONMENT.tokenNames.cookies.access,
      ENVIRONMENT.tokenNames.cookies.refresh,
      ENVIRONMENT.tokenNames.headers.access,
      ENVIRONMENT.tokenNames.headers.refresh,
    ]),
  ];
}

export async function securityPlugin(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  const allowlist = tokenHeaderAllowlist();

  await app.register(cors, {
    origin: ENVIRONMENT.cors.origin.split(',').map(s => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', ...allowlist],
    exposedHeaders: [
      ...allowlist,
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials',
    ],
  });

  await app.register(cookie, {
    secret: ENVIRONMENT.jwt.secret,
  });

  const useRedisStore = ENVIRONMENT.nodeEnv === 'production';

  await app.register(rateLimit, {
    max: ENVIRONMENT.rateLimit.max,
    timeWindow: ENVIRONMENT.rateLimit.timeWindow,
    ...(useRedisStore
      ? {
          redis: getRedisClient(),
          nameSpace: 'oj-api-rate-limit:',
          skipOnError: true,
        }
      : {}),
  });
}
