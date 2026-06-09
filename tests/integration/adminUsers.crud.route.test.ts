import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';
import { buildAccessAuthHeader } from '../helpers/auth';

const USERS_BASE = `${API_V1_PREFIX}/admin/users`;
const USER_ID = '507f1f77bcf86cd799439011';

const userDoc = {
  _id: USER_ID,
  firstName: 'Test',
  lastName: 'User',
  email: 'user@example.com',
  avatar: '',
  accountStatus: 'active',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  auth: { lastLogin: null },
};

vi.mock('../../src/services/adminPermission.service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../../src/services/adminPermission.service')>();

  return {
    ...actual,
    adminHasRequiredPermissions: vi.fn(actual.adminHasRequiredPermissions),
  };
});

vi.mock('../../src/repositories/admin/user.repository', () => ({
  listAdminUserRows: vi.fn(),
  findAdminUserById: vi.fn(),
}));

vi.mock('../../src/services/userSuspension.service', () => ({
  applyUserAccountStatusUpdate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/services/adminUser.service', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/services/adminUser.service')>();

  return {
    ...actual,
    approveUserDeletionRequest: vi.fn(actual.approveUserDeletionRequest),
  };
});

import * as adminPermissionService from '../../src/services/adminPermission.service';
import { listAdminUserRows, findAdminUserById } from '../../src/repositories/admin/user.repository';
import { applyUserAccountStatusUpdate } from '../../src/services/userSuspension.service';
import * as adminUserService from '../../src/services/adminUser.service';

function buildAdminAuthHeader(): Record<string, string> {
  return buildAccessAuthHeader('console-access', {
    userId: '507f1f77bcf86cd799439099',
    email: 'admin@example.com',
  });
}

function grantAdminPermissions(): void {
  vi.mocked(adminPermissionService.adminHasRequiredPermissions).mockResolvedValue(true);
}

describe('admin users CRUD routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.mocked(adminPermissionService.adminHasRequiredPermissions).mockReset();
    vi.mocked(listAdminUserRows).mockReset();
    vi.mocked(findAdminUserById).mockReset();
    vi.mocked(applyUserAccountStatusUpdate).mockClear();
    vi.mocked(adminUserService.approveUserDeletionRequest).mockReset();
  });

  it('returns 401 for GET /admin/users list without credentials', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${USERS_BASE}?page=1&limit=12`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 403 for GET /admin/users when admin lacks users.manage permission', async () => {
    vi.mocked(adminPermissionService.adminHasRequiredPermissions).mockResolvedValueOnce(false);

    const response = await app.inject({
      method: 'GET',
      url: `${USERS_BASE}?page=1&limit=12`,
      headers: buildAdminAuthHeader(),
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 200 for GET /admin/users list when repository succeeds', async () => {
    grantAdminPermissions();
    vi.mocked(listAdminUserRows).mockResolvedValueOnce({
      items: [userDoc],
      total: 1,
    });

    const response = await app.inject({
      method: 'GET',
      url: `${USERS_BASE}?page=1&limit=12`,
      headers: buildAdminAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      data?: { users?: Array<{ email: string }>; pagination?: { total: number } };
    };

    expect(body.data?.users).toHaveLength(1);
    expect(body.data?.users?.[0]?.email).toBe('user@example.com');
    expect(body.data?.pagination?.total).toBe(1);
  });

  it('returns 401 for GET /admin/users/:id without credentials', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${USERS_BASE}/${USER_ID}`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 200 for GET /admin/users/:id when repository succeeds', async () => {
    grantAdminPermissions();
    vi.mocked(findAdminUserById).mockResolvedValueOnce(userDoc);

    const response = await app.inject({
      method: 'GET',
      url: `${USERS_BASE}/${USER_ID}`,
      headers: buildAdminAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as { data?: { user?: { email: string } } };

    expect(body.data?.user?.email).toBe('user@example.com');
  });

  it('returns 401 for PATCH /admin/users/:id without credentials', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: `${USERS_BASE}/${USER_ID}`,
      payload: { accountStatus: 'suspended' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 403 for PATCH /admin/users/:id when admin lacks users.manage permission', async () => {
    vi.mocked(adminPermissionService.adminHasRequiredPermissions).mockResolvedValueOnce(false);

    const response = await app.inject({
      method: 'PATCH',
      url: `${USERS_BASE}/${USER_ID}`,
      headers: buildAdminAuthHeader(),
      payload: { accountStatus: 'suspended' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 200 for PATCH /admin/users/:id when update succeeds', async () => {
    grantAdminPermissions();
    vi.mocked(findAdminUserById).mockResolvedValueOnce({
      ...userDoc,
      accountStatus: 'suspended',
    });

    const response = await app.inject({
      method: 'PATCH',
      url: `${USERS_BASE}/${USER_ID}`,
      headers: buildAdminAuthHeader(),
      payload: { accountStatus: 'suspended', suspensionReason: 'Policy violation' },
    });

    expect(response.statusCode).toBe(200);
    expect(applyUserAccountStatusUpdate).toHaveBeenCalled();

    const body = response.json() as { data?: { user?: { accountStatus: string } } };

    expect(body.data?.user?.accountStatus).toBe('suspended');
  });

  it('returns 401 for POST /admin/users/:id/approve-deletion without credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${USERS_BASE}/${USER_ID}/approve-deletion`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 403 for POST approve-deletion when admin lacks users.manage permission', async () => {
    vi.mocked(adminPermissionService.adminHasRequiredPermissions).mockResolvedValueOnce(false);

    const response = await app.inject({
      method: 'POST',
      url: `${USERS_BASE}/${USER_ID}/approve-deletion`,
      headers: buildAdminAuthHeader(),
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 200 for POST approve-deletion when service succeeds', async () => {
    grantAdminPermissions();
    vi.mocked(adminUserService.approveUserDeletionRequest).mockResolvedValueOnce(undefined);

    const response = await app.inject({
      method: 'POST',
      url: `${USERS_BASE}/${USER_ID}/approve-deletion`,
      headers: buildAdminAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as { data?: { success?: boolean } };

    expect(body.data?.success).toBe(true);
  });
});
