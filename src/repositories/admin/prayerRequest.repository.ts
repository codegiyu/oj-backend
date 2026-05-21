import { PrayerRequest } from '../../models/prayerRequest';
import { paginatedFind, findByIdLean } from './paginatedList.repository';

export async function listAdminPrayerRequestRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return paginatedFind(PrayerRequest, options);
}

export async function findAdminPrayerRequestById(id: string) {
  return findByIdLean(PrayerRequest, id);
}
