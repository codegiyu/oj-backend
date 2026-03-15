/**
 * Google OAuth authentication for users only.
 * Admins must sign in with email and password (POST /auth/login).
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { OAuth2Client } from 'google-auth-library';
import { ENVIRONMENT } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { User } from '../../models/user';
import { unselectedFields as userUnselected } from '../../models/user';
import { getRoleWithSlug } from '../../services/role.service';
import { signAccess, signRefresh } from '../../utils/token';
import { generateRandomString } from '../../utils/helpers';
import { setAuthCookies, assertEmailNotRegisteredAsAdmin, buildClientUserPayload } from './auth.helpers';
import type { ModelUser } from '../../lib/types/constants';

export async function googleAuth(
  request: FastifyRequest<{ Body: { googleCode?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { googleCode } = request.body;
  if (!googleCode) throw new AppError('Google code is required', 400);
  if (!ENVIRONMENT.google.clientId || !ENVIRONMENT.google.clientSecret) {
    throw new AppError('Google OAuth is not configured', 500);
  }

  const googleClient = new OAuth2Client({
    clientId: ENVIRONMENT.google.clientId,
    clientSecret: ENVIRONMENT.google.clientSecret,
    redirectUri: 'postmessage',
  });

  let tokenRes;
  try {
    tokenRes = await googleClient.getToken(googleCode);
  } catch {
    throw new AppError('Exchanging google code for tokens failed', 401);
  }

  if (!tokenRes?.tokens?.id_token) throw new AppError('Failed to get ID token', 401);

  const ticket = await googleClient.verifyIdToken({
    idToken: tokenRes.tokens.id_token,
    audience: ENVIRONMENT.google.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) throw new AppError('Google token is invalid or has no email', 401);

  const { sub, email, name, picture, given_name, family_name } = payload;
  const namesSplit = (name ?? '').split(' ');

  let user: ModelUser | null = await User.findOne({
    $or: [{ googleId: sub }, { email: email!.toLowerCase() }],
  })
    .select(userUnselected.join(' '))
    .lean<ModelUser>();

  if (!user) {
    const emailLower = email!.toLowerCase();
    await assertEmailNotRegisteredAsAdmin(emailLower);
    const customerRole = await getRoleWithSlug('customer');

    if (!customerRole) throw new AppError('Customer role not found', 500);

    const jti = generateRandomString(16, 'JTI');

    const newUser = await User.create({
      firstName: given_name || namesSplit[0] || 'User',
      lastName:
        family_name || (namesSplit.length > 1 ? namesSplit[namesSplit.length - 1] : '') || 'User',
      email: email!.toLowerCase(),
      googleId: sub,
      avatar: picture || '',
      'auth.refreshTokenJTI': jti,
      'auth.roles': [{ roleId: customerRole._id, slug: customerRole.slug }],
      accountStatus: payload.email_verified ? 'active' : 'unverified',
      ...(payload.email_verified && {
        'kyc.email.isVerified': true,
        'kyc.email.data': { verifiedAt: new Date() },
      }),
    });

    user = await User.findById(newUser._id).select(userUnselected.join(' ')).lean<ModelUser>();

    if (!user) throw new AppError('Failed to create user', 500);

    const accessToken = signAccess({
      userId: String(user._id),
      email: user.email,
      scope: 'client-access',
      jti,
    });

    const refreshToken = signRefresh({
      userId: String(user._id),
      email: user.email,
      scope: 'client-access',
      jti,
    });

    setAuthCookies(reply, accessToken, refreshToken);
    const populatedUser = await buildClientUserPayload(user);

    sendResponse(reply, 200, { user: populatedUser }, 'Google sign-in successful.');
    return;
  }

  if (user.accountStatus === 'suspended') throw new AppError('Your account has been suspended', 403);
  if (user.accountStatus === 'deleted') throw new AppError('Account not found', 401);

  const jti = generateRandomString(16, 'JTI');

  await User.findByIdAndUpdate(user._id, {
    ...(user.googleId ? {} : { googleId: sub }),
    'auth.refreshTokenJTI': jti,
    'auth.lastLogin': new Date(),
  });

  const accessToken = signAccess({
    userId: String(user._id),
    email: user.email,
    scope: 'client-access',
    jti,
  });

  const refreshToken = signRefresh({
    userId: String(user._id),
    email: user.email,
    scope: 'client-access',
    jti,
  });

  setAuthCookies(reply, accessToken, refreshToken);
  const updated = await User.findById(user._id).select(userUnselected.join(' ')).lean<ModelUser>();

  const effectiveUser = (updated ?? user) as ModelUser;
  const populatedUser = await buildClientUserPayload(effectiveUser);

  sendResponse(reply, 200, { user: populatedUser }, 'Google sign-in successful.');
}
