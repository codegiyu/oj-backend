import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { authService } from '../../services/auth.service';
import { signAccess, signRefresh } from '../../utils/token';
import { generateRandomString } from '../../utils/helpers';
import { deleteFields } from '../../utils/helpers';
import { setAuthCookies, clearAuthCookies, buildClientUserPayload } from './auth.helpers';
import { Admin } from '../../models/admin';
import { User } from '../../models/user';
import { unselectedFields as adminUnselected } from '../../models/admin';
import { unselectedFields as userUnselected } from '../../models/user';
import { getAuthUser } from '../../utils/getAuthUser';
import type { ModelAdmin, ModelUser } from '../../lib/types/constants';

/** Admin sign-in only. Uses email and password; does not look up User (Google-only) accounts. */
export async function login(
  request: FastifyRequest<{ Body: { email?: string; password?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { email, password } = request.body;
  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }
  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin) throw new AppError('Invalid email or password', 401);
  const hasPassword = admin.auth?.password?.value;
  if (!hasPassword) throw new AppError('Invalid email or password', 401);
  const valid = await authService.comparePassword(password, hasPassword);
  if (!valid) throw new AppError('Invalid email or password', 401);
  if (admin.accountStatus === 'suspended') throw new AppError('Your account has been suspended', 403);
  if (admin.accountStatus === 'deleted') throw new AppError('Account not found', 401);

  const jti = generateRandomString(16, 'JTI');
  const accessToken = signAccess({
    userId: String(admin._id),
    email: admin.email,
    scope: 'console-access',
    jti,
  });
  const refreshToken = signRefresh({
    userId: String(admin._id),
    email: admin.email,
    scope: 'console-access',
    jti,
  });
  await Admin.findByIdAndUpdate(admin._id, {
    'auth.refreshTokenJTI': jti,
    'auth.lastLogin': new Date(),
  });
  setAuthCookies(reply, accessToken, refreshToken);
  const sanitized = deleteFields(admin.toObject() as Record<string, unknown>, adminUnselected);
  sendResponse(reply, 200, { user: sanitized }, 'Login successful.');
}

export async function session(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user) {
    sendResponse(reply, 200, { user: null }, 'No session.');
    return;
  }
  const scope = user.scope;
  if (scope === 'console-access') {
    const admin = await Admin.findById(user.userId)
      .select(adminUnselected.join(' '))
      .lean<ModelAdmin>();
    if (!admin || admin.accountStatus === 'deleted') {
      clearAuthCookies(reply);
      sendResponse(reply, 200, { user: null }, 'No session.');
      return;
    }
    const sanitized = deleteFields(admin as unknown as Record<string, unknown>, adminUnselected);
    sendResponse(reply, 200, { user: sanitized }, 'Session loaded.');
    return;
  }
  const userDoc = await User.findById(user.userId)
    .select(userUnselected.join(' '))
    .lean<ModelUser>();
  if (!userDoc || userDoc.accountStatus === 'deleted') {
    clearAuthCookies(reply);
    sendResponse(reply, 200, { user: null }, 'No session.');
    return;
  }

  const payload = await buildClientUserPayload(userDoc);
  sendResponse(reply, 200, { user: payload }, 'Session loaded.');
}

export async function logout(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (user) {
    if (user.scope === 'console-access') {
      await Admin.findByIdAndUpdate(user.userId, { 'auth.refreshTokenJTI': '' });
    } else {
      await User.findByIdAndUpdate(user.userId, { 'auth.refreshTokenJTI': '' });
    }
  }
  clearAuthCookies(reply);
  sendResponse(reply, 200, { success: true }, 'Logged out.');
}
