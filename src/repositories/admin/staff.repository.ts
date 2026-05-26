import { Admin } from '../../models/admin';

const LIST_SELECT =
  'firstName lastName email avatar accountStatus auth.roles createdAt updatedAt auth.lastLogin';

const DETAIL_SELECT =
  'firstName lastName email avatar accountStatus auth.roles auth.permissions createdAt updatedAt auth.lastLogin';

export async function listAdminStaffRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  const [items, total] = await Promise.all([
    Admin.find(options.filter)
      .select(LIST_SELECT)
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    Admin.countDocuments(options.filter),
  ]);

  return {
    items: items as unknown as Record<string, unknown>[],
    total,
  };
}

export async function findAdminStaffById(id: string) {
  const doc = await Admin.findById(id).select(DETAIL_SELECT).lean();

  return doc as unknown as Record<string, unknown> | null;
}

export async function findAdminStaffByEmail(email: string) {
  const doc = await Admin.findOne({ email: email.toLowerCase().trim() })
    .select(DETAIL_SELECT)
    .lean();

  return doc as unknown as Record<string, unknown> | null;
}
