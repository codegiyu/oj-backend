import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';

const VENDOR_SUSPEND = `${API_V1_PREFIX}/admin/vendors/507f1f77bcf86cd799439011/suspend`;
const APPEALS = `${API_V1_PREFIX}/admin/role-profile-appeals`;

describe('role profile lifecycle routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for vendor suspend without credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: VENDOR_SUSPEND,
      payload: { reason: 'Policy violation' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('returns 401 for appeals list without credentials', async () => {
    const response = await app.inject({ method: 'GET', url: APPEALS });
    expect(response.statusCode).toBe(401);
  });
});
