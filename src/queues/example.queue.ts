import { createQueue, createWorker } from '../config/bullmq';
import { logger } from '../utils/logger';

// Example queue for email sending
export const emailQueue = createQueue<{ to: string; subject: string; html: string }>(
  'email',
  {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  }
);

// Example worker for processing email jobs
export const emailWorker = createWorker<{ to: string; subject: string; html: string }>(
  'email',
  async (job) => {
    const { to, subject, html } = job.data;
    logger.info(`Sending email to ${to} with subject: ${subject}`);
    void html; // reserved for email sending
    // Add your email sending logic here
    // await emailService.sendEmail(to, subject, html);
  }
);
