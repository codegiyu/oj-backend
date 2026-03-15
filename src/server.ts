import { buildApp } from './app';
import { ENVIRONMENT } from './config/env';
import { logger } from './utils/logger';
import { connectDb, disconnectDb } from './config/db';
import { getRedisClient, closeRedisConnection } from './config/redis';
import { attachSocketServer } from './socket';
import { seedDb } from './seed';
import './queues/main.queue'; // register QueueEvents listeners
import { mainWorker } from './queues/main.worker';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance | null = null;

const start = async (): Promise<void> => {
  try {
    await connectDb();
    logger.info('MongoDB connected');

    await seedDb();
    logger.info('Seed completed');

    getRedisClient();
    logger.info('Redis client initialized');

    app = await buildApp();

    await app.listen({
      port: ENVIRONMENT.port,
      host: ENVIRONMENT.host,
    });

    const httpServer = app.server;
    if (httpServer) {
      attachSocketServer(httpServer);
      logger.info('Socket.io attached');
    }

    logger.info(`Server listening on http://${ENVIRONMENT.host}:${ENVIRONMENT.port}`);
    logger.info(`Environment: ${ENVIRONMENT.nodeEnv}`);
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

const shutdown = async (): Promise<void> => {
  logger.info('Shutting down server...');
  try {
    await mainWorker.close();
    logger.info('BullMQ worker closed');
  } catch (err) {
    logger.error('Error closing worker', err);
  }
  await closeRedisConnection();
  await disconnectDb();
  logger.info('MongoDB disconnected');
  if (app) {
    await app.close();
    logger.info('HTTP server closed');
  }
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();
