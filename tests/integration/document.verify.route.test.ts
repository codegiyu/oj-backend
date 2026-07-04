import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';
import { buildAccessAuthHeader } from '../helpers/auth';

const DOCUMENT_VERIFY = `${API_V1_PREFIX}/documents/verify`;
const ADMIN_DOCUMENT_VERIFY = `${API_V1_PREFIX}/admin/documents/verify`;
const DOCUMENT_ID = '507f1f77bcf86cd799439011';

const pendingDoc = {
  _id: DOCUMENT_ID,
  key: 'staging-files/music/507f1f77bcf86cd799439011/other/test.mp3',
  status: 'pending',
  expiresAt: new Date(Date.now() + 3600_000),
  entityType: 'music',
  intent: 'other',
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
  headObjectInR2: vi.fn(async () => ({ exists: true, size: 1024 })),
}));

vi.mock('../../src/models/document', () => ({
  Document: {
    findOne: vi.fn(async () => ({ ...pendingDoc, _id: DOCUMENT_ID })),
    findById: vi.fn(() => ({
      lean: vi.fn(async () => ({
        ...pendingDoc,
        _id: DOCUMENT_ID,
        status: 'verified',
      })),
    })),
    updateOne: vi.fn(async () => ({ acknowledged: true })),
  },
}));

import * as adminPermissionService from '../../src/services/adminPermission.service';
import { headObjectInR2 } from '../../src/services/r2.service';
import { Document } from '../../src/models/document';

function buildAdminAuthHeader(): Record<string, string> {
  return buildAccessAuthHeader('console-access', {
    userId: '507f1f77bcf86cd799439099',
    email: 'admin@example.com',
  });
}

function grantAdminModeratePermission(): void {
  vi.mocked(adminPermissionService.adminHasRequiredPermissions).mockResolvedValue(true);
}

describe('document verify routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.mocked(headObjectInR2).mockResolvedValue({ exists: true, size: 1024 });
    vi.mocked(Document.findOne).mockResolvedValue({ ...pendingDoc, _id: DOCUMENT_ID });
    vi.mocked(Document.findById).mockReturnValue({
      lean: vi.fn(async () => ({
        ...pendingDoc,
        _id: DOCUMENT_ID,
        status: 'verified',
      })),
    } as never);
    vi.mocked(Document.updateOne).mockClear();
    vi.mocked(adminPermissionService.adminHasRequiredPermissions).mockReset();
  });

  it('verifies a pending document via public verify endpoint', async () => {
    const response = await app.inject({
      method: 'POST',
      url: DOCUMENT_VERIFY,
      payload: { documentId: DOCUMENT_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(headObjectInR2).toHaveBeenCalledWith(pendingDoc.key);
    expect(Document.updateOne).toHaveBeenCalled();

    const body = response.json() as { data?: { document?: { status?: string } } };
    expect(body.data?.document?.status).toBe('verified');
  });

  it('marks document failed when object is missing in R2', async () => {
    vi.mocked(headObjectInR2).mockResolvedValue({ exists: false });
    vi.mocked(Document.findById).mockReturnValue({
      lean: vi.fn(async () => ({
        ...pendingDoc,
        _id: DOCUMENT_ID,
        status: 'failed',
        errorMessage: 'Object not found in R2',
      })),
    } as never);

    const response = await app.inject({
      method: 'POST',
      url: DOCUMENT_VERIFY,
      payload: { documentId: DOCUMENT_ID },
    });

    expect(response.statusCode).toBe(200);
    expect(Document.updateOne).toHaveBeenCalledWith(
      { _id: DOCUMENT_ID },
      expect.objectContaining({ status: 'failed' })
    );

    const body = response.json() as { data?: { document?: { status?: string } } };
    expect(body.data?.document?.status).toBe('failed');
  });

  it('verifies via admin endpoint when permitted', async () => {
    grantAdminModeratePermission();

    const response = await app.inject({
      method: 'POST',
      url: `${ADMIN_DOCUMENT_VERIFY}/${DOCUMENT_ID}`,
      headers: buildAdminAuthHeader(),
    });

    expect(response.statusCode).toBe(200);
    expect(headObjectInR2).toHaveBeenCalled();
  });
});
