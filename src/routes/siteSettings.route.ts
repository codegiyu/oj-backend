import { FastifyInstance } from 'fastify';
import { catchAsync } from '../utils/catchAsync';
import { getSiteSettings } from '../controllers/siteSettings/siteSettings.controller';
import { updateSiteSettings } from '../controllers/siteSettings/siteSettings.controller';
import { adminSettingsRoute } from '../utils/adminRouteHandlers';
import {
  getSiteSettingsParamsSchema,
  updateSiteSettingsBodySchema,
  type SiteSettingsSlice,
} from '../controllers/siteSettings/siteSettings.validation';

export function registerSiteSettingsRoutes(app: FastifyInstance): void {
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

export function registerAdminSiteSettingsRoutes(app: FastifyInstance): void {
  app.patch<{
    Body: { settingsPayload: Array<{ name: SiteSettingsSlice; value: Record<string, unknown> }> };
  }>(
    '/',
    {
      preHandler: adminSettingsRoute.preHandler,
      schema: updateSiteSettingsBodySchema,
    },
    catchAsync(updateSiteSettings)
  );
}
