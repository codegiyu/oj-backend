import { Queue, Worker, QueueOptions, WorkerOptions } from 'bullmq';
import { ENVIRONMENT } from './env';
import { logger } from '../utils/logger';

export const bullmqConnection = {
  url: ENVIRONMENT.redis.url,
};

export const createQueue = <T = unknown>(
  name: string,
  options?: Partial<QueueOptions>
): Queue<T> => {
  return new Queue<T>(name, {
    connection: bullmqConnection,
    ...options,
  });
};

export const createWorker = <T = unknown>(
  name: string,
  processor: (job: { data: T }) => Promise<void>,
  options?: Partial<WorkerOptions>
): Worker<T> => {
  const worker = new Worker<T>(
    name,
    async (job) => {
      logger.info(`Processing job ${job.id} in queue ${name}`);
      await processor(job);
    },
    {
      connection: bullmqConnection,
      ...options,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed in queue ${name}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed in queue ${name}:`, err);
  });

  return worker;
};
