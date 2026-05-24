import { describe, expect, it } from 'vitest';
import {
  adminListServiceResult,
  buildAdminListPayload,
} from '../../src/services/admin/adminListResponse';

describe('adminListResponse', () => {
  it('builds paginated payload with totalPages', () => {
    const data = buildAdminListPayload('music', 2, 10, 25, [{ _id: '1' }]);
    const pagination = data.pagination as {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    expect(pagination.page).toBe(2);
    expect(pagination.limit).toBe(10);
    expect(pagination.total).toBe(25);
    expect(pagination.totalPages).toBe(3);
    expect(data.music).toHaveLength(1);
  });

  it('returns zero totalPages when total is zero', () => {
    const data = buildAdminListPayload('news', 1, 12, 0, []);
    const pagination = data.pagination as { totalPages: number };
    expect(pagination.totalPages).toBe(1);
  });

  it('wraps payload in service result', () => {
    const result = adminListServiceResult('videos', 'ok', 1, 12, 0, []);
    expect(result.statusCode).toBe(200);
    expect(result.message).toBe('ok');
    expect(result.data.videos).toEqual([]);
  });
});
