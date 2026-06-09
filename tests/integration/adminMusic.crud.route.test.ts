import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';
import { buildAccessAuthHeader } from '../helpers/auth';
import { adminListServiceResult } from '../../src/services/admin/adminListResponse';

const MUSIC_BASE = `${API_V1_PREFIX}/admin/music`;

const { MUSIC_ID, musicDoc, musicSave } = vi.hoisted(() => {
  const id = '507f1f77bcf86cd799439011';
  const save = vi.fn().mockResolvedValue(undefined);
  const doc = {
    _id: { toString: () => id },
    title: 'Test Track',
    slug: 'test-track',
    status: 'draft',
    description: '',
    coverImage: '',
    audioUrl: '',
    videoUrl: '',
    downloadUrl: '',
    excerpt: '',
    category: '',
    tags: [],
    metadata: {},
    isMonetizable: false,
    price: 0,
    views: 0,
    plays: 0,
    downloads: 0,
    artist: null,
    album: null,
    toObject() {
      return doc;
    },
    save,
  };

  return { MUSIC_ID: id, musicDoc: doc, musicSave: save };
});

vi.mock('../../src/services/adminPermission.service', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../../src/services/adminPermission.service')>();

  return {
    ...actual,
    adminHasRequiredPermissions: vi.fn(actual.adminHasRequiredPermissions),
  };
});

vi.mock('../../src/services/adminMusic.service', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/services/adminMusic.service')>();

  return {
    ...actual,
    listAdminMusic: vi.fn(actual.listAdminMusic),
    getAdminMusic: vi.fn(actual.getAdminMusic),
  };
});

vi.mock('../../src/models/music', () => ({
  Music: {
    findOne: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    }),
    create: vi.fn().mockResolvedValue(musicDoc),
    findById: vi.fn().mockImplementation(() => ({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(musicDoc),
      }),
    })),
    findByIdAndDelete: vi.fn().mockResolvedValue(musicDoc),
  },
}));

vi.mock('../../src/services/frontendRevalidation.service', () => ({
  schedulePublishedContentRevalidation: vi.fn(),
  scheduleFrontendRevalidation: vi.fn(),
}));

vi.mock('../../src/utils/mediaMetadataEnqueue', () => ({
  enqueueMediaMetadataProbe: vi.fn(),
  shouldEnqueueMetadataProbe: vi.fn().mockReturnValue(false),
}));

import * as adminPermissionService from '../../src/services/adminPermission.service';
import * as adminMusicService from '../../src/services/adminMusic.service';
import { Music } from '../../src/models/music';

function buildAdminAuthHeader(): Record<string, string> {
  return buildAccessAuthHeader('console-access', {
    userId: '507f1f77bcf86cd799439099',
    email: 'admin@example.com',
  });
}

function grantAdminPermissions(): void {
  vi.mocked(adminPermissionService.adminHasRequiredPermissions).mockResolvedValue(true);
}

function setupMusicModelMocks(): void {
  vi.mocked(Music.findById).mockImplementation(
    () =>
      ({
        populate: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(musicDoc),
        }),
      }) as never
  );
  vi.mocked(Music.findByIdAndDelete).mockResolvedValue(musicDoc as never);
}

describe('admin music CRUD routes', () => {
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
    vi.mocked(adminMusicService.listAdminMusic).mockReset();
    vi.mocked(adminMusicService.getAdminMusic).mockReset();
    setupMusicModelMocks();
    musicSave.mockClear();
  });

  it('returns 401 for GET /admin/music list without credentials', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${MUSIC_BASE}?page=1&limit=12`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 403 for GET /admin/music when admin lacks read permission', async () => {
    vi.mocked(adminPermissionService.adminHasRequiredPermissions).mockResolvedValueOnce(false);

    const response = await app.inject({
      method: 'GET',
      url: `${MUSIC_BASE}?page=1&limit=12`,
      headers: buildAdminAuthHeader(),
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 200 for GET /admin/music list when service succeeds', async () => {
    grantAdminPermissions();
    vi.mocked(adminMusicService.listAdminMusic).mockResolvedValueOnce(
      adminListServiceResult('music', 'Music list loaded.', 1, 12, 1, [
        { _id: MUSIC_ID, title: 'Test Track', status: 'draft' },
      ])
    );

    const response = await app.inject({
      method: 'GET',
      url: `${MUSIC_BASE}?page=1&limit=12`,
      headers: buildAdminAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as { data?: { music?: unknown[]; pagination?: { total: number } } };

    expect(body.data?.music).toHaveLength(1);
    expect(body.data?.pagination?.total).toBe(1);
  });

  it('returns 200 for GET /admin/music/:id when service succeeds', async () => {
    grantAdminPermissions();
    vi.mocked(adminMusicService.getAdminMusic).mockResolvedValueOnce({
      statusCode: 200,
      data: { music: { _id: MUSIC_ID, title: 'Test Track', status: 'draft' } },
      message: 'Music loaded.',
    });

    const response = await app.inject({
      method: 'GET',
      url: `${MUSIC_BASE}/${MUSIC_ID}`,
      headers: buildAdminAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as { data?: { music?: { _id: string } } };

    expect(body.data?.music?._id).toBe(MUSIC_ID);
  });

  it('returns 401 for POST /admin/music without credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: MUSIC_BASE,
      payload: { title: 'New Track' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 403 for POST /admin/music when admin lacks write permission', async () => {
    vi.mocked(adminPermissionService.adminHasRequiredPermissions).mockResolvedValueOnce(false);

    const response = await app.inject({
      method: 'POST',
      url: MUSIC_BASE,
      headers: buildAdminAuthHeader(),
      payload: { title: 'New Track' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 201 for POST /admin/music when write permission is granted', async () => {
    grantAdminPermissions();

    const response = await app.inject({
      method: 'POST',
      url: MUSIC_BASE,
      headers: buildAdminAuthHeader(),
      payload: { title: 'New Track', status: 'draft' },
    });

    expect(response.statusCode).toBe(201);

    const body = response.json() as { data?: { music?: { title: string } } };

    expect(body.data?.music?.title).toBe('Test Track');
  });

  it('returns 403 for PATCH /admin/music/:id when admin lacks write permission', async () => {
    vi.mocked(adminPermissionService.adminHasRequiredPermissions).mockResolvedValueOnce(false);

    const response = await app.inject({
      method: 'PATCH',
      url: `${MUSIC_BASE}/${MUSIC_ID}`,
      headers: buildAdminAuthHeader(),
      payload: { title: 'Updated Track' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 200 for PATCH /admin/music/:id when write permission is granted', async () => {
    grantAdminPermissions();
    vi.mocked(Music.findById)
      .mockResolvedValueOnce(musicDoc as never)
      .mockImplementationOnce(
        () =>
          ({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue({ ...musicDoc, title: 'Updated Track' }),
            }),
          }) as never
      );

    const response = await app.inject({
      method: 'PATCH',
      url: `${MUSIC_BASE}/${MUSIC_ID}`,
      headers: buildAdminAuthHeader(),
      payload: { title: 'Updated Track' },
    });

    expect(response.statusCode).toBe(200);
    expect(musicSave).toHaveBeenCalled();
  });

  it('returns 401 for DELETE /admin/music/:id without credentials', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `${MUSIC_BASE}/${MUSIC_ID}`,
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 403 for DELETE /admin/music/:id when admin lacks delete permission', async () => {
    vi.mocked(adminPermissionService.adminHasRequiredPermissions).mockResolvedValueOnce(false);

    const response = await app.inject({
      method: 'DELETE',
      url: `${MUSIC_BASE}/${MUSIC_ID}`,
      headers: buildAdminAuthHeader(),
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 200 for DELETE /admin/music/:id when delete permission is granted', async () => {
    grantAdminPermissions();

    const response = await app.inject({
      method: 'DELETE',
      url: `${MUSIC_BASE}/${MUSIC_ID}`,
      headers: buildAdminAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as { data?: { success?: boolean } };

    expect(body.data?.success).toBe(true);
  });
});
