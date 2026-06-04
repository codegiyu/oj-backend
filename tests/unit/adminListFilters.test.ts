import { describe, expect, it } from 'vitest';
import { applyAdminUnlinkedProfileFilter } from '../../src/controllers/admin/adminListFilters';

describe('applyAdminUnlinkedProfileFilter', () => {
  it('does nothing when unlinked is not set', () => {
    const filter: Record<string, unknown> = { status: 'active' };
    applyAdminUnlinkedProfileFilter(filter, {});
    expect(filter).toEqual({ status: 'active' });
  });

  it('filters to profiles without a linked user when unlinked=true', () => {
    const filter: Record<string, unknown> = {};
    applyAdminUnlinkedProfileFilter(filter, { unlinked: 'true' });
    expect(filter).toEqual({
      $or: [{ user: null }, { user: { $exists: false } }],
    });
  });
});
