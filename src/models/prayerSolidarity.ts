import { Schema, model } from 'mongoose';
import type { ModelPrayerSolidarity } from '../lib/types/constants';

const prayerSolidaritySchema = new Schema<ModelPrayerSolidarity>(
  {
    prayerRequest: {
      type: Schema.Types.ObjectId,
      ref: 'PrayerRequest',
      required: true,
      index: true,
    },
    voterIdentifier: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'prayersolidarities' }
);

prayerSolidaritySchema.index({ prayerRequest: 1, voterIdentifier: 1 }, { unique: true });

export const PrayerSolidarity = model<ModelPrayerSolidarity>(
  'PrayerSolidarity',
  prayerSolidaritySchema
);
