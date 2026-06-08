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
 * Access and refresh tokens use independent JTIs; only the refresh JTI is stored in the DB.
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
  const oldRefreshJti = payload.jti;
  const newAccessJti = generateRandomString(16, 'AJTI');
  const newRefreshJti = generateRandomString(16, 'RJTI');

  if (scope === 'console-access') {
    const admin = await Admin.findById(userId)
      .select('email accountStatus auth.refreshTokenJTI')
      .lean();
    if (!admin || admin.accountStatus === 'deleted' || admin.accountStatus === 'suspended') {
      return null;
    }
    if (admin.auth?.refreshTokenJTI !== oldRefreshJti) {
      return null;
    }

    await Admin.findByIdAndUpdate(userId, { 'auth.refreshTokenJTI': newRefreshJti });
    await invalidateAuthCache(admin.email, 'admin');

    return {
      authUser: { userId, email: admin.email, scope, jti: newAccessJti },
      accessToken: signAccess({ userId, email: admin.email, scope, jti: newAccessJti }),
      refreshToken: signRefresh({ userId, email: admin.email, scope, jti: newRefreshJti }),
    };
  }

  const user = await User.findById(userId)
    .select('email accountStatus auth.refreshTokenJTI')
    .lean();
  if (!user || user.accountStatus === 'deleted' || user.accountStatus === 'suspended') {
    return null;
  }
  if (user.auth?.refreshTokenJTI !== oldRefreshJti) {
    return null;
  }

  await User.findByIdAndUpdate(userId, { 'auth.refreshTokenJTI': newRefreshJti });
  await invalidateAuthCache(user.email, 'user');

  return {
    authUser: { userId, email: user.email, scope, jti: newAccessJti },
    accessToken: signAccess({ userId, email: user.email, scope, jti: newAccessJti }),
    refreshToken: signRefresh({ userId, email: user.email, scope, jti: newRefreshJti }),
  };
}
