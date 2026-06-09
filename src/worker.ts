import { connectDb, disconnectDb } from './config/db';
import { getRedisClient, closeRedisConnection } from './config/redis';
import './queues/main.queue';
import { registerChartJobSchedulers } from './queues/chartSchedulers';
import { mainWorker } from './queues/main.worker';
import { logger } from './utils/logger';

let isShuttingDown = false;

const start = async (): Promise<void> => {
  try {
    await connectDb();
    logger.info('MongoDB connected (worker)');

    getRedisClient();
    logger.info('Redis client initialized (worker)');

    await registerChartJobSchedulers();

    logger.info('BullMQ worker process started');
  } catch (error) {
    logger.error('Error starting worker:', error);
    process.exit(1);
  }
};

const shutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`Shutting down worker (${signal})...`);

  let exitCode = 0;

  try {
    await mainWorker.close();
    logger.info('BullMQ worker closed');
  } catch (err) {
    logger.error('Error closing worker', err);
    exitCode = 1;
  }

  try {
    await closeRedisConnection();
  } catch (err) {
    logger.error('Error closing Redis', err);
    exitCode = 1;
  }

  try {
    await disconnectDb();
    logger.info('MongoDB disconnected');
  } catch (err) {
    logger.error('Error disconnecting MongoDB', err);
    exitCode = 1;
  }

  process.exit(exitCode);
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

void start();
