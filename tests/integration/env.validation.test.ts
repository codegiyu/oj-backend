import { describe, expect, it } from 'vitest';
import { EnvironmentValidationError, loadEnvironment } from '../../src/config/env';

const productionBase = {
  NODE_ENV: 'production',
  DATABASE_URL: 'mongodb://db.example.com/oj',
  JWT_SECRET: 'production-jwt-secret-32chars',
  REFRESH_TOKEN_SECRET: 'production-refresh-secret-32chars',
};

describe('loadEnvironment (production)', () => {
  it('throws when JWT_SECRET is missing', () => {
    const { JWT_SECRET: _removed, ...env } = productionBase;

    expect(() => loadEnvironment(env as NodeJS.ProcessEnv)).toThrow(EnvironmentValidationError);
    expect(() => loadEnvironment(env as NodeJS.ProcessEnv)).toThrow(/JWT_SECRET/);
  });

  it('throws when REFRESH_TOKEN_SECRET is missing', () => {
    const { REFRESH_TOKEN_SECRET: _removed, ...env } = productionBase;

    expect(() => loadEnvironment(env as NodeJS.ProcessEnv)).toThrow(/REFRESH_TOKEN_SECRET/);
  });

  it('throws when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _removed, ...env } = productionBase;

    expect(() => loadEnvironment(env as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL/);
  });

  it('rejects legacy placeholder JWT secrets', () => {
    expect(() =>
      loadEnvironment({
        ...productionBase,
        JWT_SECRET: 'your-secret-key',
      } as NodeJS.ProcessEnv)
    ).toThrow(/placeholder|default/i);
  });

  it('loads valid production configuration', () => {
    const env = loadEnvironment(productionBase as NodeJS.ProcessEnv);

    expect(env.nodeEnv).toBe('production');
    expect(env.databaseUrl).toBe(productionBase.DATABASE_URL);
    expect(env.jwt.secret).toBe(productionBase.JWT_SECRET);
    expect(env.jwt.refreshSecret).toBe(productionBase.REFRESH_TOKEN_SECRET);
    expect(env.auth.requireRefreshToken).toBe(true);
    expect(env.jwt.expiresIn).toBe('1h');
  });
});

describe('loadEnvironment (development)', () => {
  it('applies dev-only defaults when secrets are unset', () => {
    const env = loadEnvironment({
      NODE_ENV: 'development',
    } as NodeJS.ProcessEnv);

    expect(env.jwt.secret).toContain('dev-only');
    expect(env.databaseUrl).toContain('mongodb://localhost');
  });
});
