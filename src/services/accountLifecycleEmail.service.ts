import { User } from '../models/user';
import { ENVIRONMENT } from '../config/env';
import { addJobToQueue } from '../queues/main.queue';
import { logger } from '../utils/logger';

export type AccountLifecycleEmailEvent =
  | 'userAccountSuspended'
  | 'userAccountUnsuspended'
  | 'roleProfileDeactivated'
  | 'roleProfileReactivated'
  | 'roleProfileSuspended'
  | 'roleProfileUnsuspended';

const EVENT_TITLES: Record<AccountLifecycleEmailEvent, string> = {
  userAccountSuspended: 'Your OJ Multimedia account has been suspended',
  userAccountUnsuspended: 'Your OJ Multimedia account has been restored',
  roleProfileDeactivated: 'Your profile has been deactivated',
  roleProfileReactivated: 'Your profile has been reactivated',
  roleProfileSuspended: 'Your profile has been suspended',
  roleProfileUnsuspended: 'Your profile has been restored',
};

function smtpConfigured(): boolean {
  return Boolean(ENVIRONMENT.email.smtp.user && ENVIRONMENT.email.smtp.pass);
}

export async function enqueueAccountLifecycleEmail(options: {
  userId: string;
  email: string;
  name?: string;
  event: AccountLifecycleEmailEvent;
  reason?: string;
  profileLabel?: string;
}): Promise<void> {
  if (!smtpConfigured()) {
    logger.debug('Skipping lifecycle email — SMTP not configured');
    return;
  }

  const user = await User.findById(options.userId).select('preferences').lean();
  if (user?.preferences?.emailNotifications === false) return;

  const profilePart = options.profileLabel ? ` (${options.profileLabel})` : '';
  const reasonPart = options.reason?.trim() ? `\n\nReason: ${options.reason.trim()}` : '';
  const message = `${EVENT_TITLES[options.event]}${profilePart}.${reasonPart}`;

  try {
    await addJobToQueue({
      type: 'notificationEmail',
      to: options.email,
      name: options.name,
      title: EVENT_TITLES[options.event],
      message,
      eventType: options.event,
      userModel: 'User',
    });
  } catch (err) {
    logger.warn({ err, event: options.event }, 'Failed to enqueue lifecycle email');
  }
}
