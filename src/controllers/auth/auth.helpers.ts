import { FastifyReply } from 'fastify';
import { ENVIRONMENT } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { authService } from '../../services/auth.service';
import { signAccess, signRefresh } from '../../utils/token';
import { generateRandomString } from '../../utils/helpers';
import { deleteFields } from '../../utils/helpers';
import { Admin } from '../../models/admin';
import { User } from '../../models/user';
import { Artist } from '../../models/artist';
import { Vendor } from '../../models/vendor';
import { unselectedFields as adminUnselected } from '../../models/admin';
import { unselectedFields as userUnselected } from '../../models/user';
import { findAdminByEmail, findUserByEmail, invalidateAuthCache } from '../../utils/authCache';
import type { ModelAdmin, ModelUser } from '../../lib/types/constants';
import { serializePopulatedUser } from '../user/dashboard.helpers';

/**
 * Emails must not be shared between User and Admin accounts.
 * Use these before creating a User (e.g. Google sign-up) or an Admin (e.g. invite).
 */

/** Throws if the email is already registered as an admin. Use before creating a user (e.g. Google sign-up). */
export async function assertEmailNotRegisteredAsAdmin(email: string): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const exists = await Admin.exists({ email: normalized });
  if (exists) {
    throw new AppError(
      'This email is registered as an admin. Please sign in with email and password on the admin portal.',
      403
    );
  }
}

/** Throws if the email is already registered as a user. Use before creating an admin (e.g. invite). */
export async function assertEmailNotRegisteredAsUser(email: string): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const exists = await User.exists({ email: normalized, isDeleted: { $ne: true } });
  if (exists) {
    throw new AppError(
      'This email is already registered as a user account. Use a different email for the admin account.',
      403
    );
  }
}

const accessCookieName = ENVIRONMENT.tokenNames.cookies.access;
const refreshCookieName = ENVIRONMENT.tokenNames.cookies.refresh;
const cookiePath = '/';
const sameSite = 'none' as const;
/** SameSite=None requires Secure. Use secure when production or when sameSite is 'none'. */
const secure = true;

export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string
): void {
  const baseOptions = {
    path: cookiePath,
    httpOnly: true,
    secure,
    partitioned: true,
    sameSite,
  };

  reply.setCookie(accessCookieName, accessToken, {
    ...baseOptions,
    maxAge: ENVIRONMENT.jwt.accessCookieMaxAge,
  });
  reply.setCookie(refreshCookieName, refreshToken, {
    ...baseOptions,
    maxAge: ENVIRONMENT.jwt.refreshCookieMaxAge,
  });
}

/** Must pass same path, secure, sameSite as setAuthCookies for the browser to clear correctly. */
export function clearAuthCookies(reply: FastifyReply): void {
  const clearOptions = { path: cookiePath, secure, sameSite };
  reply.clearCookie(accessCookieName, clearOptions);
  reply.clearCookie(refreshCookieName, clearOptions);
}

export type AccessType = 'client' | 'console';

/**
 * Build the client-facing user payload with linked artist/vendor summaries.
 * Used by session, Google auth, and any other client-access flows that return a user object.
 */
export async function buildClientUserPayload(
  user: ModelUser
): Promise<Record<string, unknown>> {
  const sanitized = deleteFields(user as unknown as Record<string, unknown>, userUnselected);

  if (user.artistId) {
    const artist = await Artist.findById(user.artistId).select('_id name slug image').lean();
    if (artist) {
      (sanitized as Record<string, unknown>).artist = {
        _id: artist._id,
        name: artist.name,
        slug: artist.slug,
        image: artist.image,
      };
    }
  }

  if (user.vendorId) {
    const vendor = await Vendor.findById(user.vendorId)
      .select('_id slug storeName name')
      .lean();
    if (vendor) {
      (sanitized as Record<string, unknown>).vendor = {
        _id: vendor._id,
        slug: vendor.slug,
        storeName: vendor.storeName,
        // Optional backward-compatible name field
        name: vendor.name,
      };
    }
  }

  return sanitized;
}

export async function processPasswordChange(options: {
  reply: FastifyReply;
  user: ModelAdmin | ModelUser;
  password: string;
  accessType: AccessType;
}): Promise<void> {
  const { reply, user, password, accessType } = options;

  const hashedPassword = await authService.hashPassword(password);
  if (!hashedPassword) throw new AppError('Failed to create password', 500);

  const currentHash = user.auth?.password?.value;
  if (currentHash) {
    const same = await authService.comparePassword(password, currentHash);
    if (same) throw new AppError('New password cannot be the same as the current password', 400);
  }

  const jti = generateRandomString(16, 'JTI');
  const scope = accessType === 'console' ? 'console-access' : 'client-access';
  const userId = String((user as { _id: unknown })._id);
  const email = user.email;

  await invalidateAuthCache(email, accessType === 'console' ? 'admin' : 'user');

  if (accessType === 'console') {
    await Admin.findOneAndUpdate(
      { email },
      {
        'auth.refreshTokenJTI': jti,
        'auth.password.value': hashedPassword,
        'auth.password.passwordChangedAt': new Date(),
      }
    );
  } else {
    await User.findOneAndUpdate(
      { email },
      {
        'auth.refreshTokenJTI': jti,
        'auth.password.value': hashedPassword,
        'auth.password.passwordChangedAt': new Date(),
      }
    );
  }

  const accessToken = signAccess({ userId, email, scope, jti });
  const refreshToken = signRefresh({ userId, email, scope, jti });
  setAuthCookies(reply, accessToken, refreshToken);

  const updated =
    accessType === 'console'
      ? await findAdminByEmail(email)
      : await findUserByEmail(email);

  if (!updated) throw new AppError('Password update failed', 500);

  const userPayload =
    accessType === 'client'
      ? serializePopulatedUser(
          (await buildClientUserPayload(updated as unknown as ModelUser)) as Record<string, unknown>
        )
      : deleteFields(
          updated as unknown as Record<string, unknown>,
          adminUnselected
        );
  sendResponse(reply, 200, { user: userPayload }, 'Password changed successfully.');
}
