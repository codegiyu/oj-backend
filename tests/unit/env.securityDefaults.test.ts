import { describe, expect, it } from 'vitest';
import {
  loadEnvironment,
  parseCorsOrigins,
  resolveRequireRefreshToken,
} from '../../src/config/env';

const productionBase = {
  NODE_ENV: 'production',
  DATABASE_URL: 'mongodb://db.example.com/oj',
  JWT_SECRET: 'production-jwt-secret-32chars',
  REFRESH_TOKEN_SECRET: 'production-refresh-secret-32chars',
};

describe('resolveRequireRefreshToken', () => {
  it('defaults to true in production and staging when unset', () => {
    expect(resolveRequireRefreshToken({ NODE_ENV: 'production' }, 'production')).toBe(true);
    expect(resolveRequireRefreshToken({ NODE_ENV: 'staging' }, 'staging')).toBe(true);
  });

  it('defaults to false in development when unset', () => {
    expect(resolveRequireRefreshToken({ NODE_ENV: 'development' }, 'development')).toBe(false);
  });

  it('honours explicit REQUIRE_REFRESH_TOKEN overrides', () => {
    expect(
      resolveRequireRefreshToken({ REQUIRE_REFRESH_TOKEN: 'false', NODE_ENV: 'production' }, 'production')
    ).toBe(false);
    expect(
      resolveRequireRefreshToken({ REQUIRE_REFRESH_TOKEN: 'true', NODE_ENV: 'development' }, 'development')
    ).toBe(true);
  });
});

describe('JWT security defaults', () => {
  it('uses one-hour access token defaults in development', () => {
    const env = loadEnvironment({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);

    expect(env.jwt.expiresIn).toBe('1h');
    expect(env.jwt.accessCookieMaxAge).toBe(60 * 60);
    expect(env.auth.requireRefreshToken).toBe(false);
  });

  it('requires refresh tokens by default in production', () => {
    const env = loadEnvironment(productionBase as NodeJS.ProcessEnv);

    expect(env.jwt.expiresIn).toBe('1h');
    expect(env.jwt.accessCookieMaxAge).toBe(60 * 60);
    expect(env.auth.requireRefreshToken).toBe(true);
  });
});

describe('parseCorsOrigins', () => {
  it('splits comma-separated origins and trims whitespace', () => {
    expect(
      parseCorsOrigins({
        CORS_ORIGIN: 'https://ojmultimedia.com, https://admin.ojmultimedia.com',
      } as NodeJS.ProcessEnv)
    ).toEqual(['https://ojmultimedia.com', 'https://admin.ojmultimedia.com']);
  });

  it('falls back to localhost in development', () => {
    expect(parseCorsOrigins({} as NodeJS.ProcessEnv)).toEqual(['http://localhost:3000']);
  });
});

describe('loadEnvironment mongo and port defaults', () => {
  it('defaults API port to 4400 and mongo pool settings', () => {
    const env = loadEnvironment({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);

    expect(env.port).toBe(4400);
    expect(env.mongo.maxPoolSize).toBe(10);
    expect(env.mongo.serverSelectionTimeoutMS).toBe(5000);
    expect(env.mongo.retryWrites).toBe(true);
  });

  it('honours mongo pool env overrides', () => {
    const env = loadEnvironment({
      NODE_ENV: 'development',
      MONGO_MAX_POOL_SIZE: '25',
      MONGO_SERVER_SELECTION_TIMEOUT_MS: '8000',
      MONGO_RETRY_WRITES: 'false',
    } as NodeJS.ProcessEnv);

    expect(env.mongo.maxPoolSize).toBe(25);
    expect(env.mongo.serverSelectionTimeoutMS).toBe(8000);
    expect(env.mongo.retryWrites).toBe(false);
  });
});

describe('loadEnvironment cors origins', () => {
  it('exposes parsed origins on the environment object', () => {
    const env = loadEnvironment({
      NODE_ENV: 'development',
      CORS_ORIGIN: 'http://localhost:3000,http://localhost:3001',
    } as NodeJS.ProcessEnv);

    expect(env.cors.origins).toEqual(['http://localhost:3000', 'http://localhost:3001']);
  });
});
