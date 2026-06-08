import { Admin } from '../../models/admin';
import type { ModelAdmin } from '../../lib/types/constants';

const LIST_SELECT =
  'firstName lastName email avatar accountStatus auth.roles createdAt updatedAt auth.lastLogin';

const DETAIL_SELECT =
  'firstName lastName email avatar accountStatus auth.roles auth.permissions createdAt updatedAt auth.lastLogin';

export async function listAdminStaffRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}): Promise<{ items: ModelAdmin[]; total: number }> {
  const [items, total] = await Promise.all([
    Admin.find(options.filter)
      .select(LIST_SELECT)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean<ModelAdmin[]>(),
    Admin.countDocuments(options.filter),
  ]);

  return { items, total };
}

export async function findAdminStaffById(id: string): Promise<ModelAdmin | null> {
  const doc = await Admin.findById(id).select(DETAIL_SELECT).lean<ModelAdmin>();

  return doc ?? null;
}

export async function findAdminStaffByEmail(email: string): Promise<ModelAdmin | null> {
  const doc = await Admin.findOne({ email: email.toLowerCase().trim() })
    .select(DETAIL_SELECT)
    .lean<ModelAdmin>();

  return doc ?? null;
}
