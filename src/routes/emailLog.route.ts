import { FastifyInstance } from 'fastify';
import { adminPreHandlers } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import { listEmailLogs } from '../controllers/emailLog/listEmailLogs';
import { getEmailLogDetails } from '../controllers/emailLog/getEmailLogDetails';
import { resendEmail } from '../controllers/emailLog/resendEmail';

export function registerAdminEmailLogRoutes(app: FastifyInstance): void {
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
  }>('/', { preHandler: adminPreHandlers }, catchAsync(listEmailLogs));
  app.post<{ Params: { emailLogId: string } }>(
    '/resend/:emailLogId',
    { preHandler: adminPreHandlers },
    catchAsync(resendEmail)
  );
  app.get<{ Params: { emailLogId: string } }>(
    '/:emailLogId',
    { preHandler: adminPreHandlers },
    catchAsync(getEmailLogDetails)
  );
}
