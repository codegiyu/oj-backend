import mongoose from 'mongoose';
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

export async function findRecentActivePrayerRequests(
  limit: number
): Promise<Record<string, unknown>[]> {
  const items = await PrayerRequest.find({ status: 'active' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return items as unknown as Record<string, unknown>[];
}

export async function incrementPrayerCount(
  prayerRequestId: mongoose.Types.ObjectId
): Promise<number | null> {
  const updated = await PrayerRequest.findByIdAndUpdate(
    prayerRequestId,
    { $inc: { prayers: 1 } },
    { new: true }
  ).lean();

  if (!updated) return null;

  return typeof updated.prayers === 'number' ? updated.prayers : 0;
}

export async function createPrayerRequest(
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const doc = await PrayerRequest.create(data);
  const raw = (doc.toObject ? doc.toObject() : doc) as unknown as Record<string, unknown>;

  return raw;
}
