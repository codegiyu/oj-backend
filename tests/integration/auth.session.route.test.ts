import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';
import {
  buildClientAccessAuthHeader,
  buildExpiredAccessAuthHeader,
} from '../helpers/auth';

vi.mock('../../src/models/admin', () => ({
  Admin: {
    findOne: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    findByIdAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../src/models/user', () => ({
  User: {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    findByIdAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../src/utils/authCache', () => ({
  invalidateAuthCache: vi.fn().mockResolvedValue(undefined),
  addAdminToCache: vi.fn().mockResolvedValue(undefined),
  addUserToCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/auditLog.service', () => ({
  recordAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

const AUTH_BASE = `${API_V1_PREFIX}/auth`;

describe('auth session routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with user null for GET /auth/session without credentials', async () => {
    const response = await app.inject({ method: 'GET', url: `${AUTH_BASE}/session` });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      success?: boolean;
      data?: { user?: unknown };
      message?: string;
    };

    expect(body.success).toBe(true);
    expect(body.data?.user).toBeNull();
    expect(String(body.message ?? '')).toMatch(/no session/i);
  });

  it('returns 200 with user null when access token is expired and refresh token is absent', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${AUTH_BASE}/session`,
      headers: buildExpiredAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as { success?: boolean; data?: { user?: unknown } };

    expect(body.success).toBe(true);
    expect(body.data?.user).toBeNull();
  });

  it('returns 400 for POST /auth/login when required fields are missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${AUTH_BASE}/login`,
      payload: {},
    });

    expect(response.statusCode).toBe(400);

    const body = response.json() as { success?: boolean; message?: string };

    expect(body.success ?? false).toBe(false);
  });

  it('returns 400 for POST /auth/login when password is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${AUTH_BASE}/login`,
      payload: { email: 'admin@example.com' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 401 for POST /auth/login with invalid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${AUTH_BASE}/login`,
      payload: {
        email: 'nonexistent-admin@example.com',
        password: 'wrong-password',
      },
    });

    expect(response.statusCode).toBe(401);

    const body = response.json() as { success?: boolean; message?: string };

    expect(body.success ?? false).toBe(false);
    expect(String(body.message ?? '')).toMatch(/invalid email or password/i);
  });

  it('returns 401 for POST /auth/logout without credentials', async () => {
    const response = await app.inject({ method: 'POST', url: `${AUTH_BASE}/logout` });

    expect(response.statusCode).toBe(401);

    const body = response.json() as { success?: boolean; message?: string };

    expect(body.success ?? false).toBe(false);
    expect(String(body.message ?? '')).toMatch(/unauthorized/i);
  });

  it('returns 200 for POST /auth/logout with a valid access token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${AUTH_BASE}/logout`,
      headers: buildClientAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as { success?: boolean; data?: { success?: boolean } };

    expect(body.success).toBe(true);
    expect(body.data?.success).toBe(true);
  });

  it('returns 200 for GET /auth/session with a valid access token', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${AUTH_BASE}/session`,
      headers: buildClientAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as { success?: boolean; data?: { user?: unknown } };

    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('user');
  });
});
