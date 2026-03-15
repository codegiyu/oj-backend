import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { EmailLog } from '../../models/emailLog';
import { getAuthUser } from '../../utils/getAuthUser';
import { addJobToQueue } from '../../queues/main.queue';
import type { JobData } from '../../lib/types/queues';

export async function resendEmail(
  request: FastifyRequest<{ Params: { emailLogId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'console-access') {
    throw new AppError('Access denied: only admins may resend emails', 403);
  }

  const { emailLogId } = request.params;
  if (!emailLogId) throw new AppError('Email log ID is required', 400);
  if (!mongoose.Types.ObjectId.isValid(emailLogId)) {
    throw new AppError('Invalid email log ID format', 400);
  }

  const emailLog = await EmailLog.findById(emailLogId);
  if (!emailLog) throw new AppError('Email log not found', 404);

  if (emailLog.status !== 'failed' && emailLog.status !== 'bounced') {
    throw new AppError(
      `Cannot resend email with status '${emailLog.status}'. Only failed or bounced emails can be resent.`,
      400
    );
  }

  const metadata = emailLog.metadata || {};
  const storedJobData = (metadata.jobData as Record<string, unknown>) || {};

  const jobDataPayload: Record<string, unknown> = {
    ...storedJobData,
    type: storedJobData.type || emailLog.type,
    to: storedJobData.to || emailLog.to,
    emailLogId,
  };
  if (emailLog.subject) jobDataPayload.subject = emailLog.subject;

  try {
    const newJobId = await addJobToQueue(jobDataPayload as unknown as JobData);
    if (!newJobId) throw new AppError('Failed to queue email for resending', 500);

    const updatedEmailLog = await EmailLog.findById(emailLogId);

    sendResponse(reply, 200, {
      emailLog: {
        _id: emailLog._id,
        status: 'pending',
        jobId: newJobId,
        to: emailLog.to,
        type: emailLog.type,
        retryCount: updatedEmailLog?.retryCount ?? (emailLog.retryCount || 0) + 1,
      },
    }, 'Email queued for resend.');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (error instanceof AppError) throw error;
    throw new AppError(`Failed to resend email: ${msg}`, 500);
  }
}
