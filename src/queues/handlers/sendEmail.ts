import type { Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import type { JSX } from 'react';
import { OTPCode } from '../templates/OTP';
import { ResetPasswordLink } from '../templates/ResetPassword';
import { NotificationEmailTemplate } from '../templates/NotificationEmail';
import { InviteAdminTemplate } from '../templates/InviteAdmin';
import { getAppBranding } from '../../utils/branding';
import { EmailLog } from '../../models/emailLog';
import { createEmailLog, updateEmailStatus } from '../../utils/emailTracking';
import { logger } from '../../utils/logger';
import { ENVIRONMENT } from '../../config/env';
import type { JOB_TYPE, JobData } from '../../lib/types/queues';

const TEMPLATES: Partial<
  Record<
    JOB_TYPE,
    { subject: string; template: (data: JobData & { branding: ReturnType<typeof getAppBranding> }) => JSX.Element }
  >
> = {
  verificationCode: {
    subject: 'Account verification code',
    template: OTPCode as (data: JobData & { branding: ReturnType<typeof getAppBranding> }) => JSX.Element,
  },
  resetPassword: {
    subject: 'Reset your password',
    template: ResetPasswordLink as (data: JobData & { branding: ReturnType<typeof getAppBranding> }) => JSX.Element,
  },
  notificationEmail: {
    subject: 'You have a new notification',
    template: NotificationEmailTemplate as (data: JobData & { branding: ReturnType<typeof getAppBranding> }) => JSX.Element,
  },
  inviteAdmin: {
    subject: 'Your invitation to OJ Multimedia Admin',
    template: InviteAdminTemplate as (data: JobData & { branding: ReturnType<typeof getAppBranding> }) => JSX.Element,
  },
};

export async function sendEmail(job: Job<JobData>): Promise<void> {
  const data = job.data as JobData & { emailLogId?: string };
  const { type, to, emailLogId } = data;
  const jobId = job.id?.toString();
  const branding = getAppBranding();
  const from = `"${branding.email.fromName}" <${branding.email.from}>`;
  const options = TEMPLATES[type as JOB_TYPE];

  if (!options) {
    logger.warn(`No email template for type: ${type}`);
    return;
  }

  const subject = data.subject ?? options.subject;
  let emailLog: Awaited<ReturnType<typeof EmailLog.findOne>> = null;

  if (emailLogId) {
    emailLog = await EmailLog.findById(emailLogId).exec();
    if (emailLog) {
      await EmailLog.updateOne(
        { _id: emailLogId },
        { $set: { status: 'pending' }, $inc: { retryCount: 1 } }
      );
      emailLog = await EmailLog.findById(emailLogId).exec();
    }
  } else if (jobId) {
    emailLog = await EmailLog.findOne({ jobId }).exec();
  }

  if (!emailLog && jobId) {
    emailLog = await createEmailLog({
      jobId,
      type: type as JOB_TYPE,
      to,
      from,
      subject,
      provider: 'smtp',
      metadata: { jobData: data },
    });
  }

  const templatePayload = emailLog?.metadata?.jobData
    ? { ...(emailLog.metadata.jobData as Record<string, unknown>), ...data, branding }
    : { ...data, branding };

  try {
    const html = await render(
      options.template(
        templatePayload as JobData & { branding: ReturnType<typeof getAppBranding> }
      )
    );

    const transporter = nodemailer.createTransport({
      host: ENVIRONMENT.email.smtp.host,
      port: ENVIRONMENT.email.smtp.port,
      secure: ENVIRONMENT.email.smtp.secure,
      auth: ENVIRONMENT.email.smtp.user
        ? { user: ENVIRONMENT.email.smtp.user, pass: ENVIRONMENT.email.smtp.pass }
        : undefined,
    });

    const result = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    const updateIdentifier = emailLogId ? { _id: emailLogId } : { jobId: jobId! };
    await updateEmailStatus(updateIdentifier, {
      status: 'sent',
      sentAt: new Date(),
      messageId: result.messageId,
      htmlContent: html,
    });
    logger.info(`Email sent to ${to} (job ${job.id})`);
  } catch (err) {
    logger.error('Send email failed', { jobId: job.id, to, err });
    const updateIdentifier = emailLogId ? { _id: emailLogId } : { jobId: jobId! };
    await updateEmailStatus(updateIdentifier, {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
