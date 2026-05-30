import { Queue, QueueEvents } from 'bullmq';
import { ENVIRONMENT } from '../config/env';
import { type JOB_TYPE, type JobData } from '../lib/types/queues';
import { getEmailLog, updateEmailStatus } from '../utils/emailTracking';
import { logger } from '../utils/logger';

const redisConnection = {
  url: ENVIRONMENT.redis.url,
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

const handleJobFailed = async (jobId: string, failedReason?: string): Promise<void> => {
  logger.error(`Job ${jobId} failed: ${failedReason}`);
  try {
    const emailLog = await getEmailLog({ jobId });
    if (emailLog && EMAIL_JOB_TYPES.includes(emailLog.type)) {
      if (emailLog.status === 'pending') {
        await updateEmailStatus(
          { jobId },
          { status: 'failed', error: failedReason ?? 'Job failed' }
        );
      }
    }
  } catch (err) {
    logger.error('Failed to update email log on job failure', { jobId, err });
  }
};

const handleJobCompleted = async (jobId: string): Promise<void> => {
  try {
    const emailLog = await getEmailLog({ jobId });
    if (emailLog && EMAIL_JOB_TYPES.includes(emailLog.type)) {
      if (emailLog.status === 'pending') {
        await updateEmailStatus({ jobId }, { status: 'sent', sentAt: new Date(), error: null });
      }
    }
  } catch (err) {
    logger.error('Failed to update email log on job completion', { jobId, err });
  }
};

mainQueueEvents.on('failed', ({ jobId, failedReason }) => {
  void handleJobFailed(String(jobId), failedReason);
});

mainQueueEvents.on('completed', ({ jobId }) => {
  void handleJobCompleted(String(jobId));
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
