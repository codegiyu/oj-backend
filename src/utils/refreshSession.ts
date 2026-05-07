import type { AuthUser } from '../lib/types/constants';
import { Admin } from '../models/admin';
import { User } from '../models/user';
import { invalidateAuthCache } from './authCache';
import { generateRandomString } from './helpers';
import { signAccess, signRefresh, verifyRefresh } from './token';

export type RotatedSession = {
  authUser: AuthUser;
  accessToken: string;
  refreshToken: string;
};

/**
 * Validates a refresh JWT and DB jti, rotates refresh jti, and returns new tokens + auth user.
 * Returns null if the refresh token is invalid, expired, or revoked.
 */
export async function rotateSessionFromRefresh(refreshJwt: string): Promise<RotatedSession | null> {
  const payload = verifyRefresh(refreshJwt);
  if (!payload?.userId || !payload.email || !payload.scope || !payload.jti) {
    return null;
  }

  const { scope } = payload;
  if (scope !== 'client-access' && scope !== 'console-access') {
    return null;
  }

  const userId = String(payload.userId);
  const oldJti = payload.jti;

  if (scope === 'console-access') {
    const admin = await Admin.findById(userId)
      .select('email accountStatus auth.refreshTokenJTI')
      .lean();
    if (!admin || admin.accountStatus === 'deleted' || admin.accountStatus === 'suspended') {
      return null;
    }
    if (admin.auth?.refreshTokenJTI !== oldJti) {
      return null;
    }

    const newJti = generateRandomString(16, 'JTI');
    await Admin.findByIdAndUpdate(userId, { 'auth.refreshTokenJTI': newJti });
    await invalidateAuthCache(admin.email, 'admin');

    return {
      authUser: { userId, email: admin.email, scope, jti: newJti },
      accessToken: signAccess({ userId, email: admin.email, scope, jti: newJti }),
      refreshToken: signRefresh({ userId, email: admin.email, scope, jti: newJti }),
    };
  }

  const user = await User.findById(userId)
    .select('email accountStatus auth.refreshTokenJTI')
    .lean();
  if (!user || user.accountStatus === 'deleted' || user.accountStatus === 'suspended') {
    return null;
  }
  if (user.auth?.refreshTokenJTI !== oldJti) {
    return null;
  }

  const newJti = generateRandomString(16, 'JTI');
  await User.findByIdAndUpdate(userId, { 'auth.refreshTokenJTI': newJti });
  await invalidateAuthCache(user.email, 'user');

  return {
    authUser: { userId, email: user.email, scope, jti: newJti },
    accessToken: signAccess({ userId, email: user.email, scope, jti: newJti }),
    refreshToken: signRefresh({ userId, email: user.email, scope, jti: newJti }),
  };
}
