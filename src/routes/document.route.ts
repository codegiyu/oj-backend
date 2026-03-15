import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
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

export async function registerDocumentRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { documentId?: string; key?: string } }>(
    '/verify',
    { schema: verifyDocumentBodySchema },
    catchAsync(verifyDocument)
  );
}

export async function registerAdminDocumentRoutes(app: FastifyInstance): Promise<void> {
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
      preHandler: authenticate,
      schema: listDocumentsQuerystringSchema,
    },
    catchAsync(listDocuments)
  );
  app.get<{ Params: { documentId: string } }>(
    '/:documentId',
    {
      preHandler: authenticate,
      schema: getDocumentDetailsParamsSchema,
    },
    catchAsync(getDocumentDetails)
  );
  app.post<{ Params: { documentId: string } }>(
    '/verify/:documentId',
    {
      preHandler: authenticate,
      schema: verifyDocumentAdminParamsSchema,
    },
    catchAsync(verifyDocumentAdmin)
  );
}
