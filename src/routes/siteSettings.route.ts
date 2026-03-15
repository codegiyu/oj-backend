import { FastifyInstance } from 'fastify';
import { catchAsync } from '../utils/catchAsync';
import { getSiteSettings } from '../controllers/siteSettings/siteSettings.controller';
import { updateSiteSettings } from '../controllers/siteSettings/siteSettings.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  getSiteSettingsParamsSchema,
  updateSiteSettingsBodySchema,
  type SiteSettingsSlice,
} from '../controllers/siteSettings/siteSettings.validation';

export async function registerSiteSettingsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { slice?: string } }>(
    '/',
    { schema: { params: { type: 'object', properties: { slice: { type: 'string' } } } } },
    catchAsync(getSiteSettings)
  );
  app.get<{ Params: { slice: string } }>(
    '/:slice',
    { schema: getSiteSettingsParamsSchema },
    catchAsync(getSiteSettings)
  );
}

export async function registerAdminSiteSettingsRoutes(app: FastifyInstance): Promise<void> {
  app.patch<{
    Body: { settingsPayload: Array<{ name: SiteSettingsSlice; value: Record<string, unknown> }> };
  }>(
    '/',
    {
      preHandler: authenticate,
      schema: updateSiteSettingsBodySchema,
    },
    catchAsync(updateSiteSettings)
  );
}
