import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { User } from '../../models/user';
import { unselectedFields as userUnselected } from '../../models/user';
import { getFromCache, removeFromCache } from '../../utils/cache';
import { updateCachedUser } from '../../utils/authCache';
import { verifyOtpToken } from '../../utils/token';

export async function verifyOTP(
  request: FastifyRequest<{
    Body: { code?: string; email?: string; scope?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { code, email, scope } = request.body ?? {};
  if (!code || !email || !scope) {
    throw new AppError('Code, email and scope are required', 400);
  }

  const token = (await getFromCache<string>(`pers:${email}:${scope}` as `pers:${string}`)) as string | null;
  if (!token) throw new AppError('Invalid OTP code or token', 400);

  const decoded = verifyOtpToken(token);
  if (!decoded) throw new AppError('Invalid or expired verification code or token', 400);
  if (decoded.code !== code) throw new AppError('Invalid or expired verification code or token', 400);
  if (decoded.scope !== scope) throw new AppError('Invalid verification scope', 400);

  await removeFromCache(`pers:${email}:${scope}` as `pers:${string}`);

  let updatedUser = null;
  if (scope === 'verify-email') {
    updatedUser = await User.findOneAndUpdate(
      { email: (email as string).toLowerCase() },
      {
        accountStatus: 'active',
        'kyc.email.isVerified': true,
        'kyc.email.data': { verifiedAt: new Date() },
      },
      { returnDocument: 'after' }
    )
      .select(userUnselected.join(' '))
      .lean();
    if (!updatedUser) throw new AppError('User account not found', 401);
    await updateCachedUser(updatedUser);
  }

  sendResponse(reply, 200, {
    ...(updatedUser ? { user: updatedUser } : {}),
  }, 'Verification successful.');
}
