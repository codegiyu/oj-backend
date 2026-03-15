import { createOtpToken } from '../../utils/token';
import { addToCache } from '../../utils/cache';
import { addJobToQueue } from '../../queues/main.queue';
import { generateRandomString } from '../../utils/helpers';
import { ENVIRONMENT } from '../../config/env';

export type AccessType = 'client' | 'console';

export const RESET_LINK_EXPIRATION_SECONDS = 60 * 30; // 30 minutes

export async function sendPasswordResetLink(options: {
  email: string;
  name: string;
  accessType: AccessType;
  expirationTime?: number;
}): Promise<void> {
  const {
    email,
    name,
    accessType,
    expirationTime = RESET_LINK_EXPIRATION_SECONDS,
  } = options;

  const baseUrl =
    accessType === 'console'
      ? ENVIRONMENT.appUrls.adminAppUrl
      : ENVIRONMENT.appUrls.clientAppUrl;
  const resetToken = generateRandomString(10);
  const resetLink = `${baseUrl.replace(/\/$/, '')}/auth/reset-password?email=${encodeURIComponent(email)}&scopeToken=${encodeURIComponent(resetToken)}`;

  const token = createOtpToken(
    { code: resetToken, scope: 'reset-password' },
    expirationTime
  );
  await addToCache(
    `pers:${email}:reset-password` as `pers:${string}`,
    token,
    expirationTime
  );
  await addJobToQueue({
    type: 'resetPassword',
    to: email,
    name,
    link: resetLink,
  });
}
