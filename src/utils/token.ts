import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { ENVIRONMENT } from '../config/env';

export type AccessScope = 'client-access' | 'console-access';

/** Scopes for short-lived OTP/reset tokens stored in Redis */
export type TokenScope = 'verify-email' | 'reset-password';

export interface OtpTokenPayload {
  code: string;
  scope: TokenScope;
}

export interface AccessPayload {
  userId: string;
  email: string;
  scope: AccessScope;
  jti: string;
}

export interface RefreshPayload {
  userId: string;
  email: string;
  scope: AccessScope;
  jti: string;
}

export type TokenPayload = JwtPayload & (AccessPayload | RefreshPayload);

export function signAccess(payload: AccessPayload): string {
  return jwt.sign(payload, ENVIRONMENT.jwt.secret, {
    expiresIn: ENVIRONMENT.jwt.expiresIn,
  } as SignOptions);
}

export function verifyAccess(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, ENVIRONMENT.jwt.secret) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function signRefresh(payload: RefreshPayload): string {
  return jwt.sign(payload, ENVIRONMENT.jwt.refreshSecret, {
    expiresIn: ENVIRONMENT.jwt.refreshExpiresIn,
  } as SignOptions);
}

export function verifyRefresh(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, ENVIRONMENT.jwt.refreshSecret) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

/** Create a short-lived token for OTP or reset password (store in Redis with TTL). */
export function createOtpToken(payload: OtpTokenPayload, expiresInSeconds: number): string {
  return jwt.sign(
    { ...payload },
    ENVIRONMENT.jwt.secret,
    { expiresIn: expiresInSeconds } as SignOptions
  );
}

/** Verify short-lived OTP/reset token; returns payload or null. */
export function verifyOtpToken(token: string): OtpTokenPayload | null {
  try {
    const decoded = jwt.verify(token, ENVIRONMENT.jwt.secret) as OtpTokenPayload & JwtPayload;
    return { code: decoded.code, scope: decoded.scope };
  } catch {
    return null;
  }
}
