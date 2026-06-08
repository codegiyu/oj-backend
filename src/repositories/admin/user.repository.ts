import { User } from '../../models/user';
import type { ModelUser } from '../../lib/types/constants';

const LIST_SELECT =
  'firstName lastName email avatar accountStatus artistId vendorId pastorId deleteRequestedAt createdAt auth.lastLogin';

const DETAIL_SELECT =
  'firstName lastName middleName title email avatar gender phoneNumber accountStatus artistId vendorId pastorId deleteRequestedAt deletionApprovedAt deletionApprovedBy kyc auth.roles auth.lastLogin createdAt updatedAt';

const LIST_POPULATE = [
  { path: 'artistId', select: 'name slug' },
  { path: 'vendorId', select: 'name storeName slug' },
  { path: 'pastorId', select: 'name slug' },
];

const DETAIL_POPULATE = [
  { path: 'artistId', select: 'name slug image' },
  { path: 'vendorId', select: 'name storeName slug logo' },
  { path: 'pastorId', select: 'name slug image' },
  { path: 'deletionApprovedBy', select: 'firstName lastName email' },
];

export async function listAdminUserRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}): Promise<{ items: ModelUser[]; total: number }> {
  let query = User.find(options.filter)
    .select(LIST_SELECT)
    .sort(options.sort)
    .skip(options.skip)
    .limit(options.limit);

  for (const population of LIST_POPULATE) {
    query = query.populate(population);
  }

  const [items, total] = await Promise.all([
    query.lean<ModelUser[]>(),
    User.countDocuments(options.filter),
  ]);

  return { items, total };
}

export async function findAdminUserById(id: string): Promise<ModelUser | null> {
  let query = User.findById(id).select(DETAIL_SELECT);

  for (const population of DETAIL_POPULATE) {
    query = query.populate(population);
  }

  const doc = await query.lean<ModelUser>();

  return doc ?? null;
}
