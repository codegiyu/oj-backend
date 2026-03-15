import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { ENVIRONMENT } from './config/env';
import { registerJwtPlugin } from './plugins/jwt.plugin';
import { registerHealthRoutes } from './routes/health.route';
import { registerAuthRoutes } from './routes/auth.route';
import {
  registerUploadRoutes,
  registerAdminUploadRoutes,
} from './routes/upload.route';
import {
  registerDocumentRoutes,
  registerAdminDocumentRoutes,
} from './routes/document.route';
import { registerAdminEmailLogRoutes } from './routes/emailLog.route';
import { registerNotificationRoutes } from './routes/notification.route';
import {
  registerSiteSettingsRoutes,
  registerAdminSiteSettingsRoutes,
} from './routes/siteSettings.route';
import { registerMarketplaceRoutes } from './routes/marketplace.route';
import { registerUserRoutes } from './routes/user.route';
import { registerVendorRoutes } from './routes/vendor.route';
import { registerArtistRoutes } from './routes/artist.route';
import { registerPublicRoutes } from './routes/public.route';
import { errorHandler } from './middleware/errorHandler.middleware';

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: false, // We use winston instead
  });

  // Security plugins
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: ENVIRONMENT.cors.origin,
    credentials: true,
  });

  await app.register(cookie, {
    secret: ENVIRONMENT.jwt.secret,
  });

  await app.register(rateLimit, {
    max: ENVIRONMENT.rateLimit.max,
    timeWindow: ENVIRONMENT.rateLimit.timeWindow,
  });

  // JWT plugin
  await app.register(registerJwtPlugin);

  // Routes
  await app.register(registerHealthRoutes);
  await app.register(registerAuthRoutes, { prefix: '/auth' });
  await app.register(registerUploadRoutes, { prefix: '/upload' });
  await app.register(registerAdminUploadRoutes, { prefix: '/admin/upload' });
  await app.register(registerDocumentRoutes, { prefix: '/documents' });
  await app.register(registerAdminDocumentRoutes, { prefix: '/admin/documents' });
  await app.register(registerAdminEmailLogRoutes, { prefix: '/admin/email-logs' });
  await app.register(registerNotificationRoutes, { prefix: '/notifications' });
  await app.register(registerSiteSettingsRoutes, { prefix: '/site-settings' });
  await app.register(registerAdminSiteSettingsRoutes, { prefix: '/admin/site-settings' });
  await app.register(registerMarketplaceRoutes, { prefix: '/marketplace' });
  await app.register(registerUserRoutes, { prefix: '/user' });
  await app.register(registerVendorRoutes, { prefix: '/vendor' });
  await app.register(registerArtistRoutes, { prefix: '/artist' });
  await app.register(registerPublicRoutes, { prefix: '/public' });

  app.setErrorHandler(errorHandler);

  // Not found handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });

  return app;
};
