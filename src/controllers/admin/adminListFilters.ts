import { parseString } from '../../utils/helpers';

/** Restrict admin profile lists to entities with no linked user (for link pickers). */
export function applyAdminUnlinkedProfileFilter(
  filter: Record<string, unknown>,
  query: { unlinked?: string }
): void {
  const unlinked = parseString(query.unlinked);
  if (unlinked !== 'true' && unlinked !== '1') return;

  filter.$or = [{ user: null }, { user: { $exists: false } }];
}
