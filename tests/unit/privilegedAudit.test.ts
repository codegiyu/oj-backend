import { describe, expect, it } from 'vitest';
import { resolvePrivilegedAdminAction } from '../../src/utils/privilegedAudit';

describe('resolvePrivilegedAdminAction', () => {
  it('maps DELETE admin routes to admin.delete', () => {
    expect(
      resolvePrivilegedAdminAction({
        method: 'DELETE',
        routerPath: '/api/v1/admin/music/:id',
        params: { id: '507f1f77bcf86cd799439011' },
      })
    ).toEqual({
      action: 'admin.delete',
      resourceType: 'music',
      resourceId: '507f1f77bcf86cd799439011',
    });
  });

  it('maps POST approve routes to admin.approve', () => {
    expect(
      resolvePrivilegedAdminAction({
        method: 'POST',
        routerPath: '/api/v1/admin/videos/:id/approve',
        params: { id: '507f1f77bcf86cd799439012' },
      })
    ).toEqual({
      action: 'admin.approve',
      resourceType: 'videos',
      resourceId: '507f1f77bcf86cd799439012',
    });
  });

  it('maps POST reject routes to admin.reject', () => {
    expect(
      resolvePrivilegedAdminAction({
        method: 'POST',
        routerPath: '/api/v1/admin/products/:id/reject',
        params: { id: '507f1f77bcf86cd799439013' },
      })
    ).toEqual({
      action: 'admin.reject',
      resourceType: 'products',
      resourceId: '507f1f77bcf86cd799439013',
    });
  });

  it('returns null for non-admin routes', () => {
    expect(
      resolvePrivilegedAdminAction({
        method: 'DELETE',
        routerPath: '/api/v1/user/cart',
        params: {},
      })
    ).toBeNull();
  });

  it('maps DELETE gospel-verses routes to admin.delete', () => {
    expect(
      resolvePrivilegedAdminAction({
        method: 'DELETE',
        routerPath: '/api/v1/admin/gospel-verses/:id',
        params: { id: '507f1f77bcf86cd799439014' },
      })
    ).toEqual({
      action: 'admin.delete',
      resourceType: 'gospel-verses',
      resourceId: '507f1f77bcf86cd799439014',
    });
  });

  it('returns null for admin GET list routes', () => {
    expect(
      resolvePrivilegedAdminAction({
        method: 'GET',
        routerPath: '/api/v1/admin/music',
        params: {},
      })
    ).toBeNull();
  });
});
