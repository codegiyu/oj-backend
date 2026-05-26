import { describe, expect, it } from 'vitest';
import {
  applyStaffListStatusFilter,
  shapeStaffListItem,
} from '../../src/controllers/admin/staffAdmin.shapes';

describe('staffAdmin.shapes', () => {
  it('filters list by invited status', () => {
    const filter: Record<string, unknown> = {};
    applyStaffListStatusFilter(filter, 'invited');
    expect(filter.accountStatus).toBe('invited');
  });

  it('shapes staff list row', () => {
    const row = shapeStaffListItem({
      _id: '507f1f77bcf86cd799439011',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      accountStatus: 'invited',
      auth: { roles: [{ slug: 'admin' }], lastLogin: new Date('2026-01-01') },
      createdAt: new Date('2026-01-02'),
    });

    expect(row._id).toBe('507f1f77bcf86cd799439011');
    expect(row.email).toBe('ada@example.com');
    expect(row.accountStatus).toBe('invited');
    expect(row.roleSlugs).toEqual(['admin']);
    expect(row.primaryRoleSlug).toBe('admin');
  });
});
