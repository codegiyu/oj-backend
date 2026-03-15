import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import {
  presignedUrlClient,
  presignedUrlAdmin,
} from '../controllers/upload/upload.controller';
import type { PresignedBody } from '../controllers/upload/upload.controller';
import { presignedUrlBodySchema } from '../controllers/upload/upload.validation';

export async function registerUploadRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: PresignedBody }>(
    '/presigned-url',
    {
      preHandler: authenticate,
      schema: presignedUrlBodySchema,
    },
    catchAsync(presignedUrlClient)
  );
}

export async function registerAdminUploadRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: PresignedBody }>(
    '/presigned-url',
    {
      preHandler: authenticate,
      schema: presignedUrlBodySchema,
    },
    catchAsync(presignedUrlAdmin)
  );
}
