import { FastifyInstance } from 'fastify';
import { adminPreHandlers } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import { listContactSubmissions } from '../controllers/admin/contactSubmissions.controller';

export function registerAdminContactSubmissionRoutes(app: FastifyInstance): void {
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      sort?: string;
    };
  }>('/', { preHandler: adminPreHandlers }, catchAsync(listContactSubmissions));
}
