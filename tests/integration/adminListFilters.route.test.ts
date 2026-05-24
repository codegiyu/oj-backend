import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { API_V1_PREFIX } from '../../src/constants/apiVersion';
import { buildApp } from '../../src/app';

const FILTERED_LIST_ROUTES = [
  `${API_V1_PREFIX}/admin/music`,
  `${API_V1_PREFIX}/admin/videos`,
  `${API_V1_PREFIX}/admin/news`,
  `${API_V1_PREFIX}/admin/polls`,
  `${API_V1_PREFIX}/admin/resources`,
  `${API_V1_PREFIX}/admin/documents`,
  `${API_V1_PREFIX}/admin/email-logs`,
  `${API_V1_PREFIX}/admin/products`,
  `${API_V1_PREFIX}/admin/orders`,
] as const;

const FILTER_QUERY =
  'page=1&limit=12&search=test&status=published&category=worship&artist=507f1f77bcf86cd799439011&vendor=507f1f77bcf86cd799439012&sort=-createdAt';

describe('admin list filter routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(FILTERED_LIST_ROUTES)(
    'returns 401 for GET %s with filter query params when unauthenticated',
    async url => {
      const response = await app.inject({
        method: 'GET',
        url: `${url}?${FILTER_QUERY}`,
      });

      expect(response.statusCode).toBe(401);

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const body = response.json() as { success?: boolean };
      expect(body.success).toBe(false);
    }
  );
});
