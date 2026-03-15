import { getRedisClient } from '../config/redis';
import { ENVIRONMENT } from '../config/env';
import { logger } from './logger';

export type CacheKey = `vol:${string}` | `pers:${string}` | `queue:${string}`;

export const addToCache = async (
  key: CacheKey,
  value: string | number | object | Buffer,
  expiry?: number
): Promise<void> => {
  if (!key) throw new Error('Invalid key provided');
  if (value === undefined || value === null) throw new Error('Invalid value provided');
  const redis = getRedisClient();
  const serialized = typeof value === 'object' && !Buffer.isBuffer(value) ? JSON.stringify(value) : String(value);
  await redis.set(key, serialized, 'EX', expiry ?? ENVIRONMENT.redis.cacheExpiry);
};

export const getFromCache = async <T = unknown>(key: CacheKey): Promise<T | null> => {
  if (!key) throw new Error('Invalid key provided');
  const redis = getRedisClient();
  const data = await redis.get(key);
  if (data === null) return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return data as T;
  }
};

export const removeFromCache = async (key: CacheKey): Promise<number | null> => {
  if (!key) throw new Error('Invalid key provided');
  const redis = getRedisClient();
  const result = await redis.del(key);
  return result > 0 ? result : null;
};

export const getFromCacheOrDB = async <T>(
  key: CacheKey,
  dbQuery: () => Promise<T>,
  cacheDuration?: number
): Promise<T> => {
  const cached = await getFromCache<T>(key);
  if (cached !== null) return cached;
  const data = await dbQuery();
  if (data === undefined || data === null) throw new Error('Data not found');
  await addToCache(key, data as object, cacheDuration ?? ENVIRONMENT.redis.cacheExpiry);
  return data;
};

export const clearNamespace = async (namespace: string): Promise<void> => {
  const redis = getRedisClient();
  const stream = redis.scanStream({ match: `${namespace}*`, count: 100 });
  return new Promise((resolve, reject) => {
    stream.on('data', async (keys: string[]) => {
      if (keys.length > 0) {
        await redis.unlink(...keys);
        logger.debug(`Deleted ${keys.length} keys in ${namespace}`);
      }
    });
    stream.on('end', () => resolve());
    stream.on('error', (err) => reject(err));
  });
};
