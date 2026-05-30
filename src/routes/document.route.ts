import { FastifyInstance } from 'fastify';
import { adminPreHandlers } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import {
  listDocuments,
  getDocumentDetails,
  verifyDocument,
  verifyDocumentAdmin,
} from '../controllers/document/document.controller';
import {
  listDocumentsQuerystringSchema,
  getDocumentDetailsParamsSchema,
  verifyDocumentBodySchema,
  verifyDocumentAdminParamsSchema,
} from '../controllers/document/document.validation';

export function registerDocumentRoutes(app: FastifyInstance): void {
  app.post<{ Body: { documentId?: string; key?: string } }>(
    '/verify',
    { schema: verifyDocumentBodySchema },
    catchAsync(verifyDocument)
  );
}

export function registerAdminDocumentRoutes(app: FastifyInstance): void {
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      status?: string;
      entityType?: string;
      entityId?: string;
      intent?: string;
      sort?: string;
    };
  }>(
    '/',
    {
      preHandler: adminPreHandlers,
      schema: listDocumentsQuerystringSchema,
    },
    catchAsync(listDocuments)
  );
  app.get<{ Params: { documentId: string } }>(
    '/:documentId',
    {
      preHandler: adminPreHandlers,
      schema: getDocumentDetailsParamsSchema,
    },
    catchAsync(getDocumentDetails)
  );
  app.post<{ Params: { documentId: string } }>(
    '/verify/:documentId',
    {
      preHandler: adminPreHandlers,
      schema: verifyDocumentAdminParamsSchema,
    },
    catchAsync(verifyDocumentAdmin)
  );
}
