import mongoose from 'mongoose';
import { PrayerSolidarity } from '../../models/prayerSolidarity';

export async function hasPrayerSolidarity(
  prayerRequestId: mongoose.Types.ObjectId,
  voterIdentifier: string
): Promise<boolean> {
  const existing = await PrayerSolidarity.exists({
    prayerRequest: prayerRequestId,
    voterIdentifier,
  });

  return existing != null;
}

export async function createPrayerSolidarity(data: {
  prayerRequest: mongoose.Types.ObjectId;
  voterIdentifier: string;
}): Promise<void> {
  await PrayerSolidarity.create(data);
}
