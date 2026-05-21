import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis';

export type ReadinessChecks = {
  readonly mongodb: boolean;
  readonly redis: boolean;
};

export async function getReadinessChecks(): Promise<ReadinessChecks> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
  const mongodb = mongoose.connection.readyState === 1;

  let redis = false;

  try {
    const pong = await getRedisClient().ping();

    redis = pong === 'PONG';
  } catch {
    redis = false;
  }

  return { mongodb, redis };
}

export async function isApplicationReady(): Promise<boolean> {
  const checks = await getReadinessChecks();

  return checks.mongodb && checks.redis;
}
