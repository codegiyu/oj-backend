import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { Admin } from '../../models/admin';
import { User } from '../../models/user';
import { authService } from '../../services/auth.service';
import { getAuthUser } from '../../utils/getAuthUser';
import { processPasswordChange } from './auth.helpers';
import { recordAuditEvent } from '../../services/auditLog.service';
import { IAdmin, IUser } from '../../lib/types/constants';

export async function changePassword(
  request: FastifyRequest<{
    Body: {
      currentPassword?: string;
      password?: string;
      confirmPassword?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const authUser = getAuthUser(request);
  if (!authUser) throw new AppError('You must be logged in to change your password', 401);

  const { currentPassword, password, confirmPassword } = request.body ?? {};
  if (!currentPassword) throw new AppError('Current password is required', 400);
  if (!password || !confirmPassword) {
    throw new AppError('Password and confirm password are required', 400);
  }
  if (password !== confirmPassword) {
    throw new AppError('Password and confirm password do not match', 400);
  }

  const accessType = authUser.scope === 'console-access' ? 'console' : 'client';
  const user =
    accessType === 'console'
      ? await Admin.findById(authUser.userId).lean<IAdmin>()
      : await User.findById(authUser.userId).lean<IUser>();
  if (!user) throw new AppError('User not found', 404);

  const currentHash = user.auth?.password?.value;
  if (!currentHash) throw new AppError('Password not created yet', 400);

  const valid = await authService.comparePassword(currentPassword, currentHash);
  if (!valid) throw new AppError('Incorrect current password', 401);

  await processPasswordChange({
    reply,
    request,
    user: user as Parameters<typeof processPasswordChange>[0]['user'],
    password: password,
    accessType,
  });

  await recordAuditEvent({
    action: 'auth.change_password',
    actorId: authUser.userId,
    actorEmail: authUser.email,
    actorScope: authUser.scope,
    resourceType: accessType === 'console' ? 'admin' : 'user',
    requestId: String(request.id),
    method: request.method,
    path: request.url,
    statusCode: 200,
  });
}
