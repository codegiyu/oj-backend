import { FastifyInstance } from 'fastify';
import { catchAsync } from '../utils/catchAsync';
import { listContactSubmissions } from '../controllers/admin/contactSubmissions.controller';
import { adminSystemReadRoute } from '../utils/adminRouteHandlers';

export function registerAdminContactSubmissionRoutes(app: FastifyInstance): void {
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      sort?: string;
    };
  }>('/', adminSystemReadRoute, catchAsync(listContactSubmissions));
}
