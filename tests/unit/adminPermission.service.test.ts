import { describe, expect, it } from 'vitest';
import {
  ADMIN_PERMISSIONS,
  DEFAULT_ADMIN_ROLE_PERMISSIONS,
} from '../../src/constants/adminPermissions';
import { permissionsForRoleSlug } from '../../src/services/adminPermission.service';

describe('adminPermission.service', () => {
  it('grants all permissions to super-admin role slug', () => {
    const slugs = permissionsForRoleSlug('super-admin');

    expect(slugs).toHaveLength(ADMIN_PERMISSIONS.length);
    expect(slugs).toContain('admin.staff.manage');
  });

  it('grants default admin permissions without staff.manage', () => {
    const slugs = permissionsForRoleSlug('admin');

    expect(slugs).toEqual(expect.arrayContaining(DEFAULT_ADMIN_ROLE_PERMISSIONS));
    expect(slugs).not.toContain('admin.staff.manage');
    expect(slugs).not.toContain('admin.settings.manage');
  });
});
