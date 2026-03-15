import { Queue, QueueEvents } from 'bullmq';
import { ENVIRONMENT } from '../config/env';
import { type JOB_TYPE, type JobData } from '../lib/types/queues';
import { getEmailLog, updateEmailStatus } from '../utils/emailTracking';
import { logger } from '../utils/logger';

const redisConnection = {
  host: ENVIRONMENT.redis.host,
  port: ENVIRONMENT.redis.port,
  password: ENVIRONMENT.redis.password,
  db: ENVIRONMENT.redis.db,
};

export const mainQueue = new Queue<JobData>('mainQueue', {
  connection: redisConnection,
  prefix: 'queue',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

export const mainQueueEvents = new QueueEvents('mainQueue', {
  connection: redisConnection,
  prefix: 'queue',
});

const EMAIL_JOB_TYPES: readonly JOB_TYPE[] = [
  'verificationCode',
  'resetPassword',
  'notificationEmail',
  'inviteAdmin',
];

mainQueueEvents.on('failed', async ({ jobId, failedReason }) => {
  logger.error(`Job ${jobId} failed: ${failedReason}`);
  try {
    const emailLog = await getEmailLog({ jobId: String(jobId) });
    if (emailLog && EMAIL_JOB_TYPES.includes(emailLog.type)) {
      if (emailLog.status === 'pending') {
        await updateEmailStatus(
          { jobId: String(jobId) },
          { status: 'failed', error: failedReason ?? 'Job failed' }
        );
      }
    }
  } catch (err) {
    logger.error('Failed to update email log on job failure', { jobId, err });
  }
});

mainQueueEvents.on('completed', async ({ jobId }) => {
  try {
    const emailLog = await getEmailLog({ jobId: String(jobId) });
    if (emailLog && EMAIL_JOB_TYPES.includes(emailLog.type)) {
      if (emailLog.status === 'pending') {
        await updateEmailStatus(
          { jobId: String(jobId) },
          { status: 'sent', sentAt: new Date(), error: null }
        );
      }
    }
  } catch (err) {
    logger.error('Failed to update email log on job completion', { jobId, err });
  }
});

export async function addJobToQueue(
  payload: JobData,
  options?: { priority?: number; delay?: number }
): Promise<string | undefined> {
  const job = await mainQueue.add(payload.type, payload, {
    priority: options?.priority,
    delay: options?.delay,
  });
  return job.id;
}
