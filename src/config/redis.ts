import Redis from 'ioredis';
import { ENVIRONMENT } from './env';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    const retryStrategy = (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    };

    // Always use a single Redis URL.
    redisClient = new Redis(ENVIRONMENT.redis.url, {
      enableOfflineQueue: false,
      offlineQueue: false,
      retryStrategy,
      maxRetriesPerRequest: 3,
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('error', (error) => {
      logger.error('Redis client error:', error);
    });

    redisClient.on('close', () => {
      logger.warn('Redis client connection closed');
    });
  }

  return redisClient;
};

export const closeRedisConnection = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
};
