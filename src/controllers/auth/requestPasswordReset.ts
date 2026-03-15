import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { Admin } from '../../models/admin';
import { User } from '../../models/user';
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

  const emailLower = (email as string).toLowerCase();
  let resolvedAccessType: 'client' | 'console' = 'client';
  let name = emailLower;

  if (accessType) {
    resolvedAccessType = accessType;
  }

  const admin = await Admin.findOne({ email: emailLower }).lean();
  const user = await User.findOne({ email: emailLower }).lean();

  if (admin) {
    resolvedAccessType = 'console';
    name = admin.firstName ?? emailLower;
  } else if (user) {
    resolvedAccessType = 'client';
    name = user.firstName ?? emailLower;
  } else {
    throw new AppError('User not found', 404);
  }

  await sendPasswordResetLink({
    email: emailLower,
    name,
    accessType: resolvedAccessType,
  });

  await reply.status(200).send({
    success: true,
    message: 'Password reset link sent successfully',
  });
}
