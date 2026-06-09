import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';

const {
  verifyAccessWithMeta,
  verifyRefresh,
  rotateSessionFromRefresh,
  setAuthCookies,
  attachAuthTokenHeaders,
  mockEnv,
} = vi.hoisted(() => ({
  verifyAccessWithMeta: vi.fn(),
  verifyRefresh: vi.fn(),
  rotateSessionFromRefresh: vi.fn(),
  setAuthCookies: vi.fn(),
  attachAuthTokenHeaders: vi.fn(),
  mockEnv: {
    auth: { requireRefreshToken: false },
    tokenNames: {
      cookies: { access: 'oj-acc-token', refresh: 'oj-ref-token' },
      headers: { access: 'oj-acc-token', refresh: 'oj-ref-token' },
    },
  },
}));

vi.mock('../../src/config/env', () => ({
  ENVIRONMENT: mockEnv,
}));

vi.mock('../../src/utils/token', () => ({
  verifyAccessWithMeta,
  verifyRefresh,
}));

vi.mock('../../src/utils/refreshSession', () => ({
  rotateSessionFromRefresh,
}));

vi.mock('../../src/controllers/auth/auth.helpers', () => ({
  setAuthCookies,
}));

vi.mock('../../src/utils/authHeaders', () => ({
  attachAuthTokenHeaders,
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { resolveSession } from '../../src/middleware/auth.middleware';

const completePayload = {
  userId: '507f1f77bcf86cd799439011',
  email: 'auth-test@example.com',
  scope: 'client-access' as const,
  jti: 'AJTI-test-jti',
};

const rotatedSession = {
  authUser: {
    userId: completePayload.userId,
    email: completePayload.email,
    scope: completePayload.scope,
    jti: 'AJTI-rotated',
  },
  accessToken: 'rotated-access-token',
  refreshToken: 'rotated-refresh-token',
};

function buildMockRequest(
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {}
): FastifyRequest {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    headers: normalizedHeaders,
    cookies,
  } as FastifyRequest;
}

function buildMockReply(): FastifyReply {
  return {
    setCookie: vi.fn(),
    header: vi.fn().mockReturnThis(),
    request: {},
  } as unknown as FastifyReply;
}

describe('resolveSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.auth.requireRefreshToken = false;
  });

  it('returns no-session when no tokens are present', async () => {
    const request = buildMockRequest();
    const reply = buildMockReply();

    await expect(resolveSession(request, reply, {})).resolves.toBe('no-session');
    expect(request.authUser).toBeUndefined();
    expect(rotateSessionFromRefresh).not.toHaveBeenCalled();
  });

  it('returns ok and sets authUser when access token is valid', async () => {
    verifyAccessWithMeta.mockReturnValue({ payload: completePayload });

    const request = buildMockRequest({ 'oj-acc-token': 'valid-access-token' });
    const reply = buildMockReply();

    await expect(resolveSession(request, reply, {})).resolves.toBe('ok');
    expect(request.authUser).toEqual({
      userId: completePayload.userId,
      email: completePayload.email,
      scope: completePayload.scope,
      jti: completePayload.jti,
    });
    expect(request.authTokens).toEqual({
      accessToken: 'valid-access-token',
      refreshToken: '',
    });
    expect(attachAuthTokenHeaders).toHaveBeenCalledWith(reply, {
      access: 'valid-access-token',
      refresh: '',
    });
    expect(rotateSessionFromRefresh).not.toHaveBeenCalled();
  });

  it('rotates session when access token is expired and refresh token is valid', async () => {
    verifyAccessWithMeta.mockReturnValue({
      payload: null,
      jwtErrorName: 'TokenExpiredError',
    });
    rotateSessionFromRefresh.mockResolvedValue(rotatedSession);

    const request = buildMockRequest({
      'oj-acc-token': 'expired-access-token',
      'oj-ref-token': 'valid-refresh-token',
    });
    const reply = buildMockReply();

    await expect(resolveSession(request, reply, {})).resolves.toBe('ok');
    expect(rotateSessionFromRefresh).toHaveBeenCalledWith('valid-refresh-token');
    expect(request.authUser).toEqual(rotatedSession.authUser);
    expect(request.authTokens).toEqual({
      accessToken: rotatedSession.accessToken,
      refreshToken: rotatedSession.refreshToken,
    });
    expect(setAuthCookies).toHaveBeenCalledWith(
      reply,
      rotatedSession.accessToken,
      rotatedSession.refreshToken
    );
  });

  it('returns no-session when access token is expired and refresh rotation fails', async () => {
    verifyAccessWithMeta.mockReturnValue({
      payload: null,
      jwtErrorName: 'TokenExpiredError',
    });
    rotateSessionFromRefresh.mockResolvedValue(null);

    const request = buildMockRequest({
      'oj-acc-token': 'expired-access-token',
      'oj-ref-token': 'invalid-refresh-token',
    });
    const reply = buildMockReply();

    await expect(resolveSession(request, reply, {})).resolves.toBe('no-session');
    expect(request.authUser).toBeUndefined();
    expect(setAuthCookies).not.toHaveBeenCalled();
  });

  it('rotates session when only a valid refresh token is present', async () => {
    rotateSessionFromRefresh.mockResolvedValue(rotatedSession);

    const request = buildMockRequest({ 'oj-ref-token': 'valid-refresh-token' });
    const reply = buildMockReply();

    await expect(resolveSession(request, reply, {})).resolves.toBe('ok');
    expect(verifyAccessWithMeta).not.toHaveBeenCalled();
    expect(rotateSessionFromRefresh).toHaveBeenCalledWith('valid-refresh-token');
    expect(request.authUser).toEqual(rotatedSession.authUser);
    expect(setAuthCookies).toHaveBeenCalledWith(
      reply,
      rotatedSession.accessToken,
      rotatedSession.refreshToken
    );
  });

  it('returns no-session when requireRefreshToken is true and refresh token is missing', async () => {
    mockEnv.auth.requireRefreshToken = true;
    verifyAccessWithMeta.mockReturnValue({ payload: completePayload });

    const request = buildMockRequest({ 'oj-acc-token': 'valid-access-token' });
    const reply = buildMockReply();

    await expect(resolveSession(request, reply, {})).resolves.toBe('no-session');
    expect(request.authUser).toBeUndefined();
    expect(rotateSessionFromRefresh).not.toHaveBeenCalled();
  });
});
