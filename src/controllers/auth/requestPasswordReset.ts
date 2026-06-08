import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { findAdminByEmail, findUserByEmail } from '../../utils/authCache';
import { sendPasswordResetLink } from './sendPasswordResetLink';

export async function requestPasswordReset(
  request: FastifyRequest<{
    Body: { email?: string; scope?: string; accessType?: 'client' | 'console' };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { email, scope, accessType } = request.body ?? {};
  if (!email || !scope) throw new AppError('Email and scope are required', 400);
  if (scope !== 'reset-password') {
    throw new AppError('Invalid scope. Scope must be "reset-password"', 400);
  }

  const emailLower = email.toLowerCase();
  let resolvedAccessType: 'client' | 'console' = 'client';
  let name = emailLower;

  if (accessType) {
    resolvedAccessType = accessType;
  }

  const admin = await findAdminByEmail(emailLower);
  const user = await findUserByEmail(emailLower);

  if (admin) {
    resolvedAccessType = 'console';
    name = admin.firstName ?? emailLower;
  } else if (user) {
    resolvedAccessType = 'client';
    name = user.firstName ?? emailLower;
  } else {
    sendResponse(
      reply,
      200,
      { success: true },
      'If this email is registered, a password reset link has been sent.'
    );
    return;
  }

  await sendPasswordResetLink({
    email: emailLower,
    name,
    accessType: resolvedAccessType,
  });

  sendResponse(reply, 200, { success: true }, 'Password reset link sent successfully.');
}
