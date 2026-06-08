import type { Socket } from 'socket.io';
import { ENVIRONMENT } from '../config/env';
import { verifyAccess } from '../utils/token';
import { User } from '../models/user';
import { Admin } from '../models/admin';

const accessCookieName = ENVIRONMENT.tokenNames.cookies.access;

export interface SocketUser {
  _id: string;
  email: string;
  scope: 'client-access' | 'console-access';
  userModel: 'User' | 'Admin';
}

/**
 * Authenticates a socket using the access JWT only. Access tokens are stateless until expiry;
 * refresh JTI tracking applies to refresh rotation, not live socket connections.
 */
export async function authenticateSocket(socket: Socket): Promise<SocketUser | null> {
  const auth = socket.handshake.auth as Record<string, string | undefined>;
  const accessToken =
    auth?.accessToken ??
    auth?.[accessCookieName] ??
    socket.handshake.headers.cookie
      ?.split(';')
      .map(c => c.trim())
      .find(c => c.startsWith(`${accessCookieName}=`))
      ?.slice(accessCookieName.length + 1);

  if (!accessToken) {
    return null;
  }

  const payload = verifyAccess(accessToken);
  if (!payload?.userId || !payload?.email || !payload?.scope) {
    return null;
  }

  const userId = String(payload.userId);
  const scope = payload.scope;

  if (scope === 'console-access') {
    const admin = await Admin.findById(userId).select('_id email accountStatus').lean();
    if (!admin || admin.accountStatus === 'deleted' || admin.accountStatus === 'suspended') {
      return null;
    }
    return {
      _id: String(admin._id),
      email: admin.email,
      scope: 'console-access',
      userModel: 'Admin',
    };
  }

  const user = await User.findById(userId).select('_id email accountStatus').lean();
  if (!user || user.accountStatus === 'deleted' || user.accountStatus === 'suspended') {
    return null;
  }
  return {
    _id: String(user._id),
    email: user.email,
    scope: 'client-access',
    userModel: 'User',
  };
}
