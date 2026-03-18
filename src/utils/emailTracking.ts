import type { JOB_TYPE } from '../lib/types/queues';
import { EmailLog } from '../models/emailLog';
import type { EmailStatus } from '../lib/types/constants';
import type { ModelEmailLog } from '../lib/types/constants';

export async function createEmailLog(data: {
  jobId: string;
  type: JOB_TYPE;
  to: string;
  from: string;
  subject: string;
  provider?: string;
  htmlContent?: string;
  /** Store original job payload for resend (e.g. metadata.jobData) */
  metadata?: Record<string, unknown>;
}): Promise<ModelEmailLog> {
  const emailLog = await EmailLog.create({
    ...data,
    status: 'pending',
    provider: data.provider ?? 'smtp',
    metadata: data.metadata,
  });
  return emailLog as ModelEmailLog;
}

export async function updateEmailStatus(
  identifier: { jobId: string } | { _id: string },
  updates: {
    status: EmailStatus;
    error?: string | null;
    retryCount?: number;
    jobId?: string;
    sentAt?: Date;
    messageId?: string;
    htmlContent?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ModelEmailLog | null> {
  const query: Record<string, string> = {};
  if ('jobId' in identifier) query.jobId = identifier.jobId;
  if ('_id' in identifier) query._id = identifier._id;
  const updateData: Record<string, unknown> = { status: updates.status };
  if (updates.error !== undefined) updateData.error = updates.error;
  if (updates.retryCount !== undefined) updateData.retryCount = updates.retryCount;
  if (updates.jobId) updateData.jobId = updates.jobId;
  if (updates.sentAt) updateData.sentAt = updates.sentAt;
  if (updates.messageId) updateData.messageId = updates.messageId;
  if (updates.htmlContent !== undefined) updateData.htmlContent = updates.htmlContent;
  if (updates.metadata) updateData.metadata = updates.metadata;
  const emailLog = await EmailLog.findOneAndUpdate(query, updateData, { returnDocument: 'after' });
  return emailLog as ModelEmailLog | null;
}

export async function getEmailLog(
  identifier: { jobId: string } | { _id: string }
): Promise<ModelEmailLog | null> {
  const query: Record<string, string> = {};
  if ('jobId' in identifier) query.jobId = identifier.jobId;
  if ('_id' in identifier) query._id = identifier._id;
  const emailLog = await EmailLog.findOne(query);
  return emailLog as ModelEmailLog | null;
}
