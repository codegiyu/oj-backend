import { FastifyInstance } from 'fastify';
import { catchAsync } from '../utils/catchAsync';
import { listEmailLogs } from '../controllers/emailLog/listEmailLogs';
import { getEmailLogDetails } from '../controllers/emailLog/getEmailLogDetails';
import { resendEmail } from '../controllers/emailLog/resendEmail';
import { adminSystemReadRoute, adminWriteRoute } from '../utils/adminRouteHandlers';

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
  }>('/', adminSystemReadRoute, catchAsync(listEmailLogs));
  app.post<{ Params: { emailLogId: string } }>(
    '/resend/:emailLogId',
    adminWriteRoute,
    catchAsync(resendEmail)
  );
  app.get<{ Params: { emailLogId: string } }>(
    '/:emailLogId',
    adminSystemReadRoute,
    catchAsync(getEmailLogDetails)
  );
}
