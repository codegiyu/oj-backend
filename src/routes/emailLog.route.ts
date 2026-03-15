import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import { listEmailLogs } from '../controllers/emailLog/listEmailLogs';
import { getEmailLogDetails } from '../controllers/emailLog/getEmailLogDetails';
import { resendEmail } from '../controllers/emailLog/resendEmail';

export async function registerAdminEmailLogRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      status?: string;
      type?: string;
      to?: string;
      startDate?: string;
      endDate?: string;
      sort?: string;
    };
  }>(
    '/',
    { preHandler: authenticate },
    catchAsync(listEmailLogs)
  );
  app.post<{ Params: { emailLogId: string } }>(
    '/resend/:emailLogId',
    { preHandler: authenticate },
    catchAsync(resendEmail)
  );
  app.get<{ Params: { emailLogId: string } }>(
    '/:emailLogId',
    { preHandler: authenticate },
    catchAsync(getEmailLogDetails)
  );
}
