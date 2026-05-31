import { buildApp } from './app';
import { ENVIRONMENT } from './config/env';
import { logger } from './utils/logger';
import { connectDb, disconnectDb } from './config/db';
import { getRedisClient, closeRedisConnection } from './config/redis';
import { attachSocketServer, closeSocketServer } from './socket';
import { seedDb } from './seed';
import './queues/main.queue'; // register QueueEvents listeners
import { registerChartJobSchedulers } from './queues/chartSchedulers';
import { mainWorker } from './queues/main.worker';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance | null = null;
let isShuttingDown = false;

const start = async (): Promise<void> => {
  try {
    await connectDb();
    logger.info('MongoDB connected');

    getRedisClient();
    logger.info('Redis client initialized');

    seedDb();
    logger.info('Seed completed');

    await registerChartJobSchedulers();

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

    logger.info(`Server listening at http://${ENVIRONMENT.host}:${ENVIRONMENT.port}`);
    logger.info(`Environment: ${ENVIRONMENT.nodeEnv}`);
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

const shutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info(`Shutting down server (${signal})...`);

  let exitCode = 0;

  if (app) {
    try {
      await app.close();
      logger.info('HTTP server closed');
    } catch (err) {
      logger.error('Error closing HTTP server', err);
      exitCode = 1;
    } finally {
      app = null;
    }
  }

  try {
    await closeSocketServer();
  } catch (err) {
    logger.error('Error closing Socket.io', err);
    exitCode = 1;
  }

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
