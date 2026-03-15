import type { TokenScope } from '../../utils/token';
import { createOtpToken } from '../../utils/token';
import { addToCache } from '../../utils/cache';
import { addJobToQueue } from '../../queues/main.queue';
import { generateRandomNumber } from '../../utils/helpers';

export const OTP_EXPIRATION_SECONDS = 60 * 15; // 15 minutes

export async function sendVerification(options: {
  email: string;
  scope: TokenScope;
  numOfDigits?: number;
  expirationTime?: number;
  name?: string;
  avatar?: string;
}): Promise<void> {
  const {
    email,
    scope,
    numOfDigits = 6,
    expirationTime = OTP_EXPIRATION_SECONDS,
    name,
    avatar,
  } = options;

  const verificationCode = generateRandomNumber(numOfDigits);
  const token = createOtpToken({ code: verificationCode, scope }, expirationTime);

  await addToCache(`pers:${email}:${scope}` as `pers:${string}`, token, expirationTime);
  await addJobToQueue({
    type: 'verificationCode',
    to: email,
    code: verificationCode,
    name,
    avatar,
  });
}
