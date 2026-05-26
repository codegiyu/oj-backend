import { createOtpToken } from '../../utils/token';
import { addToCache } from '../../utils/cache';
import { addJobToQueue } from '../../queues/main.queue';
import { generateRandomString } from '../../utils/helpers';
import { ENVIRONMENT } from '../../config/env';
import {
  buildPasswordAuthUrl,
  RESET_LINK_EXPIRATION_SECONDS,
  type AuthAccessType,
  type PasswordAuthLinkTarget,
} from '../../utils/authLinks';

export type AccessType = AuthAccessType;

export { RESET_LINK_EXPIRATION_SECONDS };

export async function sendPasswordResetLink(options: {
  email: string;
  name: string;
  accessType: AccessType;
  linkTarget?: PasswordAuthLinkTarget;
  expirationTime?: number;
}): Promise<void> {
  const {
    email,
    name,
    accessType,
    linkTarget = 'reset',
    expirationTime = RESET_LINK_EXPIRATION_SECONDS,
  } = options;

  const baseUrl =
    accessType === 'console' ? ENVIRONMENT.appUrls.adminAppUrl : ENVIRONMENT.appUrls.clientAppUrl;
  const resetToken = generateRandomString(10);
  const resetLink = buildPasswordAuthUrl({
    baseUrl,
    accessType,
    linkTarget,
    email,
    scopeToken: resetToken,
  });

  const token = createOtpToken({ code: resetToken, scope: 'reset-password' }, expirationTime);
  await addToCache(`pers:${email}:reset-password` as `pers:${string}`, token, expirationTime);
  await addJobToQueue({
    type: 'resetPassword',
    to: email,
    name,
    link: resetLink,
  });
}

export async function sendAdminInviteLink(options: {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  expirationTime?: number;
}): Promise<string> {
  const {
    email,
    firstName,
    lastName,
    role,
    permissions,
    expirationTime = RESET_LINK_EXPIRATION_SECONDS,
  } = options;

  const emailLower = email.toLowerCase().trim();
  const scopeToken = generateRandomString(10);
  const inviteLink = buildPasswordAuthUrl({
    baseUrl: ENVIRONMENT.appUrls.adminAppUrl,
    accessType: 'console',
    linkTarget: 'invite',
    email: emailLower,
    scopeToken,
  });

  const token = createOtpToken({ code: scopeToken, scope: 'reset-password' }, expirationTime);
  await addToCache(`pers:${emailLower}:reset-password` as `pers:${string}`, token, expirationTime);

  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || emailLower;

  await addJobToQueue({
    type: 'inviteAdmin',
    to: emailLower,
    name: displayName,
    firstName,
    lastName,
    email: emailLower,
    role,
    permissions,
    token: scopeToken,
    inviteLink,
  });

  return scopeToken;
}
