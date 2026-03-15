import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { Admin } from '../../models/admin';
import { User } from '../../models/user';
import { getFromCache, removeFromCache } from '../../utils/cache';
import { verifyOtpToken } from '../../utils/token';
import { processPasswordChange } from './auth.helpers';

export async function resetPassword(
  request: FastifyRequest<{
    Body: {
      scopeToken?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const { scopeToken, email, password, confirmPassword } = request.body ?? {};
  if (!scopeToken || !email) throw new AppError('scopeToken and email are required', 400);
  if (!password || !confirmPassword) {
    throw new AppError('Password and confirm password are required', 400);
  }
  if (password !== confirmPassword) {
    throw new AppError('Password and confirm password do not match', 400);
  }

  const token = (await getFromCache<string>(
    `pers:${email}:reset-password` as `pers:${string}`
  )) as string | null;
  if (!token) throw new AppError('Invalid or expired password reset token', 400);

  const decoded = verifyOtpToken(token);
  if (!decoded) throw new AppError('Invalid or expired reset token', 400);
  if (decoded.code !== scopeToken) throw new AppError('Invalid or expired reset token', 400);
  if (decoded.scope !== 'reset-password') throw new AppError('Invalid reset scope', 400);

  const emailLower = (email as string).toLowerCase();
  const admin = await Admin.findOne({ email: emailLower }).lean();
  const user = await User.findOne({ email: emailLower }).lean();

  if (admin) {
    if (!admin.auth?.password?.value) {
      throw new AppError('Admin account does not have a password set yet', 400);
    }
    await processPasswordChange({
      reply,
      user: admin,
      password: password as string,
      accessType: 'console',
    });
  } else if (user) {
    if (!user.auth?.password?.value) {
      throw new AppError('User account does not have a password set yet', 400);
    }
    await processPasswordChange({
      reply,
      user,
      password: password as string,
      accessType: 'client',
    });
  } else {
    throw new AppError('User not found', 404);
  }

  await removeFromCache(`pers:${email}:reset-password` as `pers:${string}`);
}
