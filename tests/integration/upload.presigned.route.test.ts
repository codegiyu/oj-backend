import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';
import { buildAccessAuthHeader, buildClientAccessAuthHeader } from '../helpers/auth';

const CLIENT_UPLOAD = `${API_V1_PREFIX}/upload/presigned-url`;
const ADMIN_UPLOAD = `${API_V1_PREFIX}/admin/upload/presigned-url`;
const USER_ID = '507f1f77bcf86cd799439011';

const presignedPayload = {
  entityType: 'user',
  entityId: USER_ID,
  intent: 'avatar',
  fileExtension: 'jpg',
};

vi.mock('../../src/services/adminPermission.service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../../src/services/adminPermission.service')>();

  return {
    ...actual,
    adminHasRequiredPermissions: vi.fn(actual.adminHasRequiredPermissions),
  };
});

vi.mock('../../src/services/r2.service', () => ({
  generatePresignedUrl: vi.fn(async () => ({
    filename: 'avatar.jpg',
    url: 'https://upload.example/presigned',
    key: 'media/avatar.jpg',
    publicUrl: 'https://cdn.example/avatar.jpg',
  })),
  getContentTypeFromExtension: vi.fn((ext: string) => `image/${ext}`),
}));

vi.mock('../../src/models/document', () => ({
  Document: {
    create: vi.fn(async (data: Record<string, unknown>) => ({
      _id: { toString: () => '507f1f77bcf86cd799439099' },
      ...data,
    })),
  },
}));

vi.mock('../../src/models/user', () => ({
  User: {
    findById: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ vendorId: null }),
      }),
    }),
  },
}));

import * as adminPermissionService from '../../src/services/adminPermission.service';
import { generatePresignedUrl } from '../../src/services/r2.service';
import { Document } from '../../src/models/document';

function buildAdminAuthHeader(): Record<string, string> {
  return buildAccessAuthHeader('console-access', {
    userId: '507f1f77bcf86cd799439099',
    email: 'admin@example.com',
  });
}

function grantAdminWritePermission(): void {
  vi.mocked(adminPermissionService.adminHasRequiredPermissions).mockResolvedValue(true);
}

describe('upload presigned URL routes', () => {
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
    vi.mocked(generatePresignedUrl).mockClear();
    vi.mocked(Document.create).mockClear();
  });

  it('returns 401 for POST /upload/presigned-url without credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: CLIENT_UPLOAD,
      payload: presignedPayload,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 401 for client presigned URL when token scope is console-access', async () => {
    const response = await app.inject({
      method: 'POST',
      url: CLIENT_UPLOAD,
      headers: buildAdminAuthHeader(),
      payload: presignedPayload,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 200 for client presigned URL when user uploads for own profile', async () => {
    const response = await app.inject({
      method: 'POST',
      url: CLIENT_UPLOAD,
      headers: buildClientAccessAuthHeader({ userId: USER_ID }),
      payload: presignedPayload,
    });

    expect(response.statusCode).toBe(200);
    expect(generatePresignedUrl).toHaveBeenCalled();
    expect(Document.create).toHaveBeenCalled();

    const body = response.json() as {
      data?: { uploadUrl?: string; documentId?: string; expiresIn?: number };
    };

    expect(body.data?.uploadUrl).toBe('https://upload.example/presigned');
    expect(body.data?.documentId).toBe('507f1f77bcf86cd799439099');
    expect(body.data?.expiresIn).toBe(3600);
  });

  it('returns 403 when client uploads for another user entity', async () => {
    const response = await app.inject({
      method: 'POST',
      url: CLIENT_UPLOAD,
      headers: buildClientAccessAuthHeader({ userId: USER_ID }),
      payload: {
        ...presignedPayload,
        entityId: '507f1f77bcf86cd799439012',
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 401 for POST /admin/upload/presigned-url without credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: ADMIN_UPLOAD,
      payload: {
        entityType: 'music',
        entityId: USER_ID,
        intent: 'image',
        fileExtension: 'jpg',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 403 for admin presigned URL when admin lacks write permission', async () => {
    vi.mocked(adminPermissionService.adminHasRequiredPermissions).mockResolvedValueOnce(false);

    const response = await app.inject({
      method: 'POST',
      url: ADMIN_UPLOAD,
      headers: buildAdminAuthHeader(),
      payload: {
        entityType: 'music',
        entityId: USER_ID,
        intent: 'image',
        fileExtension: 'jpg',
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 200 for admin presigned URL when write permission is granted', async () => {
    grantAdminWritePermission();

    const response = await app.inject({
      method: 'POST',
      url: ADMIN_UPLOAD,
      headers: buildAdminAuthHeader(),
      payload: {
        entityType: 'music',
        entityId: USER_ID,
        intent: 'image',
        fileExtension: 'jpg',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(generatePresignedUrl).toHaveBeenCalled();
    expect(Document.create).toHaveBeenCalled();

    const body = response.json() as { data?: { uploadUrl?: string; key?: string } };

    expect(body.data?.uploadUrl).toBe('https://upload.example/presigned');
    expect(body.data?.key).toBe('media/avatar.jpg');
  });
});
