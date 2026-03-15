import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import { login, session, logout } from '../controllers/auth/auth.controller';
import { googleAuth } from '../controllers/auth/googleAuth';
import { requestOTP } from '../controllers/auth/requestOTP';
import { verifyOTP } from '../controllers/auth/verifyOTP';
import { requestPasswordReset } from '../controllers/auth/requestPasswordReset';
import { resetPassword } from '../controllers/auth/resetPassword';
import { changePassword } from '../controllers/auth/changePassword';
import {
  loginBodySchema,
  googleLoginBodySchema,
  requestOTPBodySchema,
  verifyOTPBodySchema,
  requestPasswordResetBodySchema,
  resetPasswordBodySchema,
  changePasswordBodySchema,
} from '../controllers/auth/auth.validation';

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { email: string; password: string } }>(
    '/login',
    { schema: loginBodySchema },
    catchAsync(login)
  );

  /** Google OAuth for users only. Admins use POST /auth/login (email/password). */
  app.post<{ Body: { googleCode: string } }>(
    '/google',
    { schema: googleLoginBodySchema },
    catchAsync(googleAuth)
  );
  /** @deprecated Use POST /auth/google. Kept for backward compatibility. */
  app.post<{ Body: { googleCode: string } }>(
    '/google-login',
    { schema: googleLoginBodySchema },
    catchAsync(googleAuth)
  );

  app.post<{ Body: { email: string; scope: string } }>(
    '/request-otp',
    { schema: requestOTPBodySchema },
    catchAsync(requestOTP)
  );

  app.post<{ Body: { code: string; email: string; scope: string } }>(
    '/verify-otp',
    { schema: verifyOTPBodySchema },
    catchAsync(verifyOTP)
  );

  app.post(
    '/request-password-reset',
    { schema: requestPasswordResetBodySchema },
    catchAsync(requestPasswordReset)
  );

  app.post<{
    Body: { scopeToken: string; email: string; password: string; confirmPassword: string };
  }>(
    '/reset-password',
    { schema: resetPasswordBodySchema },
    catchAsync(resetPassword)
  );

  app.get(
    '/session',
    { preHandler: authenticate },
    catchAsync(session)
  );

  app.patch<{
    Body: { currentPassword: string; password: string; confirmPassword: string };
  }>(
    '/change-password',
    { preHandler: authenticate, schema: changePasswordBodySchema },
    catchAsync(changePassword)
  );

  app.post(
    '/logout',
    { preHandler: authenticate },
    catchAsync(logout)
  );
}
