import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { findUserByEmail } from '../../utils/authCache';
import { sendVerification } from './sendVerification';
import type { TokenScope } from '../../utils/token';
import { addToCache } from '../../utils/cache';

const ALLOWED_SCOPES: TokenScope[] = ['verify-email'];

export async function requestOTP(
  request: FastifyRequest<{
    Body: { email?: string; scope?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { email, scope } = request.body ?? {};
  if (!email || !scope) throw new AppError('Email and scope are required', 400);
  if (!ALLOWED_SCOPES.includes(scope as TokenScope)) {
    throw new AppError('Invalid scope. Must be one of: verify-email', 400);
  }

  const user = await findUserByEmail((email as string).toLowerCase());
  if (!user) throw new AppError('User not found', 404);

  const name = user.firstName ?? email;
  await sendVerification({
    email: (email as string).toLowerCase(),
    scope: scope as TokenScope,
    name,
    avatar: user.avatar,
  });

  await addToCache(
    `pers:${email}:OTP_SENT_TIME` as `pers:${string}`,
    Date.now(),
    60 * 15
  );

  sendResponse(reply, 200, { message: 'Verification code sent successfully' }, 'Verification code sent successfully.');
}
