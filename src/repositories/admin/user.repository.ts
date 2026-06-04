import { User } from '../../models/user';

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
}) {
  let query = User.find(options.filter)
    .select(LIST_SELECT)
    .sort(options.sort)
    .skip(options.skip)
    .limit(options.limit);

  for (const population of LIST_POPULATE) {
    query = query.populate(population);
  }

  const [items, total] = await Promise.all([query.lean(), User.countDocuments(options.filter)]);

  return {
    items: items as unknown as Record<string, unknown>[],
    total,
  };
}

export async function findAdminUserById(id: string) {
  let query = User.findById(id).select(DETAIL_SELECT);

  for (const population of DETAIL_POPULATE) {
    query = query.populate(population);
  }

  const doc = await query.lean();

  return doc as unknown as Record<string, unknown> | null;
}
