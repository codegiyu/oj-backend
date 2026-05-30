import { Worker, type Job } from 'bullmq';
import { ENVIRONMENT } from '../config/env';
import { type JOB_TYPE, type JobData, type ExtractMediaMetadataJobData } from '../lib/types/queues';
import { extractMediaMetadata } from './handlers/extractMediaMetadata';
import { sendEmail } from './handlers/sendEmail';
import { logger } from '../utils/logger';

const redisConnection = {
  url: ENVIRONMENT.redis.url,
};

const EMAIL_JOB_TYPES: JOB_TYPE[] = [
  'verificationCode',
  'resetPassword',
  'notificationEmail',
  'inviteAdmin',
];

export const mainWorker = new Worker<JobData>(
  'mainQueue',
  async job => {
    const type = job.data.type;
    if (EMAIL_JOB_TYPES.includes(type)) {
      return await sendEmail(job);
    }
    if (type === 'extractMediaMetadata') {
      return await extractMediaMetadata(job as Job<ExtractMediaMetadataJobData>);
    }
    logger.warn(`Unknown job type: ${type}`);
  },
  {
    connection: redisConnection,
    prefix: 'queue',
    limiter: { max: 5, duration: 1000 },
  }
);

mainWorker.on('error', err => {
  logger.error('Main worker error', err);
});
