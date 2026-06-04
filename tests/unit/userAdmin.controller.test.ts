import { describe, expect, it } from 'vitest';
import {
  applyUserListStatusFilter,
  shapeUserDetail,
  shapeUserListItem,
} from '../../src/controllers/admin/userAdmin.shapes';

describe('userAdmin.controller', () => {
  it('shapeUserListItem serializes ids, dates, and linked profile labels', () => {
    const shaped = shapeUserListItem({
      _id: '507f1f77bcf86cd799439011',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      avatar: 'https://cdn.example/ada.jpg',
      accountStatus: 'active',
      artistId: { _id: '507f1f77bcf86cd799439012', name: 'Ada Music' },
      vendorId: { _id: '507f1f77bcf86cd799439013', storeName: 'Ada Store' },
      pastorId: { _id: '507f1f77bcf86cd799439014', name: 'Ada Pastor' },
      deleteRequestedAt: new Date('2026-05-20T12:00:00.000Z'),
      createdAt: new Date('2026-05-01T12:00:00.000Z'),
      auth: { lastLogin: new Date('2026-05-22T08:00:00.000Z') },
    });

    expect(shaped).toMatchObject({
      _id: '507f1f77bcf86cd799439011',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      accountStatus: 'active',
      artistId: '507f1f77bcf86cd799439012',
      linkedArtistName: 'Ada Music',
      vendorId: '507f1f77bcf86cd799439013',
      linkedVendorName: 'Ada Store',
      pastorId: '507f1f77bcf86cd799439014',
      linkedPastorName: 'Ada Pastor',
      deleteRequestedAt: '2026-05-20T12:00:00.000Z',
      createdAt: '2026-05-01T12:00:00.000Z',
      lastLogin: '2026-05-22T08:00:00.000Z',
    });
  });

  it('shapeUserDetail includes roles and kyc summary', () => {
    const shaped = shapeUserDetail({
      _id: '507f1f77bcf86cd799439011',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      accountStatus: 'active',
      phoneNumber: '+234800',
      auth: {
        roles: [{ slug: 'user', roleId: '507f1f77bcf86cd799439099' }],
        lastLogin: new Date('2026-05-22T08:00:00.000Z'),
      },
      kyc: {
        email: { isVerified: true },
        phoneNumber: { isVerified: false },
      },
      createdAt: new Date('2026-05-01T12:00:00.000Z'),
      updatedAt: new Date('2026-05-21T12:00:00.000Z'),
    });

    expect(shaped).toMatchObject({
      roleSlugs: ['user'],
      kycEmailVerified: true,
      kycPhoneVerified: false,
      phoneNumber: '+234800',
    });
  });

  it('applyUserListStatusFilter maps account statuses and deletion-pending', () => {
    const activeFilter: Record<string, unknown> = { status: 'active' };
    applyUserListStatusFilter(activeFilter, 'active');
    expect(activeFilter).toEqual({ accountStatus: 'active' });

    const pendingFilter: Record<string, unknown> = { status: 'deletion-pending' };
    applyUserListStatusFilter(pendingFilter, 'deletion-pending');
    expect(pendingFilter.deleteRequestedAt).toEqual({ $exists: true, $ne: null });
    expect(pendingFilter.status).toBeUndefined();
  });
});
