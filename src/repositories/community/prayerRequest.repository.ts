import { PrayerRequest } from '../../models/prayerRequest';
import { findByIdOrSlug } from './shared';

export async function countPrayerRequests(): Promise<number> {
  return PrayerRequest.countDocuments({});
}

export async function listPrayerRequests(options: {
  filter: Record<string, unknown>;
  skip: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const [items, total] = await Promise.all([
    PrayerRequest.find(options.filter)
      .sort({ createdAt: -1 })
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    PrayerRequest.countDocuments(options.filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}

export async function findPrayerRequestByIdOrSlug(
  idOrSlug: string
): Promise<Record<string, unknown> | null> {
  return findByIdOrSlug(PrayerRequest, idOrSlug, {});
}

export async function createPrayerRequest(
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const doc = await PrayerRequest.create(data);
  const raw = (doc.toObject ? doc.toObject() : doc) as unknown as Record<string, unknown>;

  return raw;
}
