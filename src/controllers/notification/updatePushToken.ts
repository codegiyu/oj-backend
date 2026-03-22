import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { invalidateAuthCache } from '../../utils/authCache';
import { getAuthUser } from '../../utils/getAuthUser';
import { Admin } from '../../models/admin';
import { User } from '../../models/user';

export async function updatePushToken(
  request: FastifyRequest<{
    Body: { pushTokenUpdate?: { pushToken?: string | null } };
  }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'console-access') {
    throw new AppError('Unauthorized', 401);
  }

  const { pushTokenUpdate } = request.body ?? {};
  if (!pushTokenUpdate || typeof pushTokenUpdate !== 'object') {
    throw new AppError('pushTokenUpdate object is required', 400);
  }

  let { pushToken } = pushTokenUpdate;
  if (pushToken !== undefined && pushToken !== null && typeof pushToken !== 'string') {
    throw new AppError('pushToken must be a string or null', 400);
  }

  const value = pushToken === null || pushToken === '' ? '' : String(pushToken).trim();
  if (value.length > 500) {
    throw new AppError('pushToken is too long', 400);
  }

  if (user.scope === 'console-access') {
    await Admin.findByIdAndUpdate(user.userId, { 'auth.pushToken': value });
  } else {
    await User.findByIdAndUpdate(user.userId, { 'auth.pushToken': value });
  }

  await invalidateAuthCache(user.email, user.scope === 'console-access' ? 'admin' : 'user');

  sendResponse(reply, 200, { registered: value.length > 0 }, 'Push token updated.');
}
