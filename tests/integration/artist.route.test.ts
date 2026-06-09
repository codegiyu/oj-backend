import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';
import { AppError } from '../../src/utils/AppError';
import { buildClientAccessAuthHeader } from '../helpers/auth';

vi.mock('../../src/services/artist.service', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/services/artist.service')>();

  return {
    ...actual,
    loadArtistMe: vi.fn(actual.loadArtistMe),
    listArtistMusic: vi.fn(actual.listArtistMusic),
    loadArtistDashboardStats: vi.fn(actual.loadArtistDashboardStats),
    createArtistProfile: vi.fn(actual.createArtistProfile),
    loadArtistMusicItem: vi.fn(actual.loadArtistMusicItem),
  };
});

import * as artistService from '../../src/services/artist.service';

const ARTIST_BASE = `${API_V1_PREFIX}/artist`;

describe('artist portal routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for GET /artist/me without credentials', async () => {
    const response = await app.inject({ method: 'GET', url: `${ARTIST_BASE}/me` });

    expect(response.statusCode).toBe(401);
  });

  it('returns 403 for GET /artist/me when user has no artist profile', async () => {
    vi.mocked(artistService.loadArtistMe).mockRejectedValueOnce(
      new AppError('You do not have an associated artist profile', 403)
    );

    const response = await app.inject({
      method: 'GET',
      url: `${ARTIST_BASE}/me`,
      headers: buildClientAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 200 for GET /artist/dashboard-stats when service succeeds', async () => {
    vi.mocked(artistService.loadArtistDashboardStats).mockResolvedValueOnce({
      tracksCount: 2,
      videosCount: 1,
      totalPlays: 10,
      totalViews: 20,
      totalDownloads: 3,
    });

    const response = await app.inject({
      method: 'GET',
      url: `${ARTIST_BASE}/dashboard-stats`,
      headers: buildClientAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as { data?: { tracksCount?: number } };

    expect(body.data?.tracksCount).toBe(2);
  });

  it('returns paginated music list from service layer', async () => {
    vi.mocked(artistService.listArtistMusic).mockResolvedValueOnce({
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      music: [],
    });

    const response = await app.inject({
      method: 'GET',
      url: `${ARTIST_BASE}/music?page=1&limit=10`,
      headers: buildClientAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as { data?: { music?: unknown[]; pagination?: { page: number } } };

    expect(body.data?.music).toEqual([]);
    expect(body.data?.pagination?.page).toBe(1);
  });

  it('returns 403 for POST /artist/music (self-serve uploads disabled)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${ARTIST_BASE}/music`,
      headers: buildClientAccessAuthHeader(),
      payload: { title: 'Test Track' },
    });

    expect(response.statusCode).toBe(403);
  });
});
