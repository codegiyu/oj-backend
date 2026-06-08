import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { comparePassword } from '../../services/auth.service';
import { deleteFields } from '../../utils/helpers';
import {
  setAuthCookies,
  clearAuthCookies,
  buildClientUserPayload,
  issueAuthTokens,
} from './auth.helpers';
import { addAdminToCache, invalidateAuthCache } from '../../utils/authCache';
import { Admin } from '../../models/admin';
import { User } from '../../models/user';
import { unselectedFields as adminUnselected } from '../../models/admin';
import { getAuthUser } from '../../utils/getAuthUser';
import { recordAuditEvent } from '../../services/auditLog.service';
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

  const valid = await comparePassword(password, hasPassword);

  if (!valid) throw new AppError('Invalid email or password', 401);
  if (admin.accountStatus === 'invited') {
    throw new AppError(
      'Your account invitation is pending. Use the link in your invitation email to set your password.',
      403
    );
  }
  if (admin.accountStatus === 'suspended')
    throw new AppError('Your account has been suspended', 403);
  if (admin.accountStatus === 'deleted') throw new AppError('Account not found', 401);

  const tokens = issueAuthTokens({
    userId: String(admin._id),
    email: admin.email,
    scope: 'console-access',
  });

  await Admin.findByIdAndUpdate(admin._id, {
    'auth.refreshTokenJTI': tokens.refreshJti,
    'auth.lastLogin': new Date(),
  });

  setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);

  const sanitized = deleteFields(
    admin.toObject() as unknown as Record<string, unknown>,
    adminUnselected
  );

  await addAdminToCache(sanitized as unknown as ModelAdmin);

  await recordAuditEvent({
    action: 'auth.login',
    actorId: String(admin._id),
    actorEmail: admin.email,
    actorScope: 'console-access',
    resourceType: 'admin',
    requestId: String(request.id),
    method: request.method,
    path: request.url,
    statusCode: 200,
  });

  sendResponse(reply, 200, { user: sanitized }, 'Login successful.');
}

export async function session(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = getAuthUser(request);

  if (!user) {
    sendResponse(reply, 200, { user: null }, 'No session.');
    return;
  }

  const scope = user.scope;

  if (scope === 'console-access') {
    const admin = await Admin.findById(user.userId).lean<ModelAdmin>();

    if (!admin || admin.accountStatus === 'deleted') {
      clearAuthCookies(reply, request);
      sendResponse(reply, 200, { user: null }, 'No session.');
      return;
    }

    const sanitized = deleteFields(admin as unknown as Record<string, unknown>, adminUnselected);

    sendResponse(reply, 200, { user: sanitized }, 'Session loaded.');
    return;
  }

  const userDoc = await User.findById(user.userId).lean<ModelUser>();

  if (!userDoc || userDoc.accountStatus === 'deleted') {
    clearAuthCookies(reply, request);
    sendResponse(reply, 200, { user: null }, 'No session.');
    return;
  }

  const payload = await buildClientUserPayload(userDoc);

  sendResponse(reply, 200, { user: payload }, 'Session loaded.');
}

export async function logout(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = getAuthUser(request);

  if (user) {
    await invalidateAuthCache(user.email, user.scope === 'console-access' ? 'admin' : 'user');
    if (user.scope === 'console-access') {
      await Admin.findByIdAndUpdate(user.userId, { 'auth.refreshTokenJTI': '' });
    } else {
      await User.findByIdAndUpdate(user.userId, { 'auth.refreshTokenJTI': '' });
    }
  }

  if (user) {
    await recordAuditEvent({
      action: 'auth.logout',
      actorId: user.userId,
      actorEmail: user.email,
      actorScope: user.scope,
      resourceType: user.scope === 'console-access' ? 'admin' : 'user',
      requestId: String(request.id),
      method: request.method,
      path: request.url,
      statusCode: 200,
    });
  }

  clearAuthCookies(reply, request);
  sendResponse(reply, 200, { success: true }, 'Logged out.');
}
