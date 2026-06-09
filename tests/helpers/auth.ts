import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ENVIRONMENT } from '../../src/config/env';
import { signAccess, type AccessPayload, type AccessScope } from '../../src/utils/token';

export function buildAccessAuthHeader(
  scope: AccessScope,
  overrides: Partial<Pick<AccessPayload, 'userId' | 'email' | 'jti'>> = {}
): Record<string, string> {
  const token = signAccess({
    userId: overrides.userId ?? '507f1f77bcf86cd799439099',
    email: overrides.email ?? 'favorites-test@example.com',
    scope,
    jti: overrides.jti ?? randomUUID(),
  });

  return {
    [ENVIRONMENT.tokenNames.headers.access]: token,
  };
}

export function buildClientAccessAuthHeader(
  overrides: Partial<Pick<AccessPayload, 'userId' | 'email' | 'jti'>> = {}
): Record<string, string> {
  return buildAccessAuthHeader('client-access', overrides);
}

export function buildExpiredAccessAuthHeader(
  scope: AccessScope = 'client-access',
  overrides: Partial<Pick<AccessPayload, 'userId' | 'email' | 'jti'>> = {}
): Record<string, string> {
  const token = jwt.sign(
    {
      userId: overrides.userId ?? '507f1f77bcf86cd799439099',
      email: overrides.email ?? 'favorites-test@example.com',
      scope,
      jti: overrides.jti ?? randomUUID(),
    },
    ENVIRONMENT.jwt.secret,
    { expiresIn: '-10s' }
  );

  return {
    [ENVIRONMENT.tokenNames.headers.access]: token,
  };
}
