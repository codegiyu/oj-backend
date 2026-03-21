import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import { listContactSubmissions } from '../controllers/admin/contactSubmissions.controller';

export async function registerAdminContactSubmissionRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      sort?: string;
    };
  }>(
    '/',
    { preHandler: authenticate },
    catchAsync(listContactSubmissions)
  );
}
