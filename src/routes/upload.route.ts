import { FastifyInstance } from 'fastify';
import { authenticatePreHandler } from '../middleware/auth.middleware';
import { adminWriteRoute } from '../utils/adminRouteHandlers';
import { catchAsync } from '../utils/catchAsync';
import { presignedUrlClient, presignedUrlAdmin } from '../controllers/upload/upload.controller';
import type { PresignedBody } from '../controllers/upload/upload.controller';
import { presignedUrlBodySchema } from '../controllers/upload/upload.validation';

export function registerUploadRoutes(app: FastifyInstance): void {
  app.post<{ Body: PresignedBody }>(
    '/presigned-url',
    {
      preHandler: [authenticatePreHandler],
      schema: presignedUrlBodySchema,
    },
    catchAsync(presignedUrlClient)
  );
}

export function registerAdminUploadRoutes(app: FastifyInstance): void {
  app.post<{ Body: PresignedBody }>(
    '/presigned-url',
    {
      preHandler: adminWriteRoute.preHandler,
      schema: presignedUrlBodySchema,
    },
    catchAsync(presignedUrlAdmin)
  );
}
