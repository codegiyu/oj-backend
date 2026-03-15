import { Role } from '../models/role';
import type { RoleSlug } from '../lib/types/constants';
import type { ModelRole } from '../lib/types/constants';

export async function getRoleWithSlug(slug: RoleSlug): Promise<ModelRole | null> {
  const role = await Role.findOne({ slug }).exec();
  return role as ModelRole | null;
}
