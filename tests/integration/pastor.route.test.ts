import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';
import { AppError } from '../../src/utils/AppError';
import { buildClientAccessAuthHeader } from '../helpers/auth';

vi.mock('../../src/services/pastorPortal.service', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/services/pastorPortal.service')>();

  return {
    ...actual,
    loadPastorMe: vi.fn(actual.loadPastorMe),
    loadPastorDashboardStats: vi.fn(actual.loadPastorDashboardStats),
    listPastorQuestions: vi.fn(actual.listPastorQuestions),
    submitPastorApplication: vi.fn(actual.submitPastorApplication),
    loadPastorProfile: vi.fn(actual.loadPastorProfile),
  };
});

import * as pastorPortalService from '../../src/services/pastorPortal.service';

const PASTOR_BASE = `${API_V1_PREFIX}/pastor`;

describe('pastor portal routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for GET /pastor/me without credentials', async () => {
    const response = await app.inject({ method: 'GET', url: `${PASTOR_BASE}/me` });

    expect(response.statusCode).toBe(401);
  });

  it('returns 403 for GET /pastor/me when user has no pastor profile', async () => {
    vi.mocked(pastorPortalService.loadPastorMe).mockRejectedValueOnce(
      new AppError('You do not have an associated pastor profile', 403)
    );

    const response = await app.inject({
      method: 'GET',
      url: `${PASTOR_BASE}/me`,
      headers: buildClientAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(403);
  });

  it('returns 200 for GET /pastor/dashboard-stats when service succeeds', async () => {
    vi.mocked(pastorPortalService.loadPastorDashboardStats).mockResolvedValueOnce({
      questionsAnswered: 5,
      pendingQuestions: 2,
      assignedQuestions: 1,
      totalUpvotes: 10,
    });

    const response = await app.inject({
      method: 'GET',
      url: `${PASTOR_BASE}/dashboard-stats`,
      headers: buildClientAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as { data?: { questionsAnswered?: number } };

    expect(body.data?.questionsAnswered).toBe(5);
  });

  it('returns paginated questions list from service layer', async () => {
    vi.mocked(pastorPortalService.listPastorQuestions).mockResolvedValueOnce({
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      questions: [],
    });

    const response = await app.inject({
      method: 'GET',
      url: `${PASTOR_BASE}/questions?page=1&limit=10`,
      headers: buildClientAccessAuthHeader(),
    });

    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      data?: { questions?: unknown[]; pagination?: { page: number } };
    };

    expect(body.data?.questions).toEqual([]);
    expect(body.data?.pagination?.page).toBe(1);
  });

  it('returns 400 for POST /pastor/application when name is missing', async () => {
    vi.mocked(pastorPortalService.submitPastorApplication).mockRejectedValueOnce(
      new AppError('Name is required', 400)
    );

    const response = await app.inject({
      method: 'POST',
      url: `${PASTOR_BASE}/application`,
      headers: buildClientAccessAuthHeader(),
      payload: { name: '' },
    });

    expect(response.statusCode).toBe(400);
  });
});
