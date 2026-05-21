import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { ENVIRONMENT } from './config/env';
import { registerHealthRoutes } from './routes/health.route';
import { registerAuthRoutes } from './routes/auth.route';
import { registerUploadRoutes, registerAdminUploadRoutes } from './routes/upload.route';
import { registerDocumentRoutes, registerAdminDocumentRoutes } from './routes/document.route';
import { registerAdminEmailLogRoutes } from './routes/emailLog.route';
import { registerAdminContactSubmissionRoutes } from './routes/contactSubmission.route';
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
import { registerAdminPromotionRoutes } from './routes/promotionAdmin.route';
import { registerAdminContentRoutes } from './routes/adminContent.route';
import { registerAdminProfileRoutes } from './routes/adminProfile.route';
import { API_V1_PREFIX } from './constants/apiVersion';
import { errorHandler } from './middleware/errorHandler.middleware';
import { sendErrorResponse } from './utils/response';
import { logger } from './utils/logger';

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: false, // We use winston instead
  });

  app.addHook('onResponse', (request, reply) => {
    logger.info('HTTP', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTimeMs: reply.elapsedTime,
    });
  });

  if (ENVIRONMENT.nodeEnv === 'development') {
    app.addHook('onRequest', (request, _reply, done) => {
      logger.debug('HTTP ingress headers snapshot', {
        method: request.method,
        url: request.url,
        hasAuthorizationHeader: typeof request.headers.authorization === 'string',
        authorizationIsBearer:
          typeof request.headers.authorization === 'string' &&
          request.headers.authorization.startsWith('Bearer '),
        hasCookieHeader: typeof request.headers.cookie === 'string',
        hasOriginHeader: typeof request.headers.origin === 'string',
        hasRefererHeader: typeof request.headers.referer === 'string',
        userAgentPresent: typeof request.headers['user-agent'] === 'string',
      });
      done();
    });
  }

  // Security plugins
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  const tokenHeaderAllowlist = [
    ...new Set([
      ENVIRONMENT.tokenNames.cookies.access,
      ENVIRONMENT.tokenNames.cookies.refresh,
      ENVIRONMENT.tokenNames.headers.access,
      ENVIRONMENT.tokenNames.headers.refresh,
    ]),
  ];

  await app.register(cors, {
    origin: ENVIRONMENT.cors.origin.split(',').map(s => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', ...tokenHeaderAllowlist],
    exposedHeaders: [
      ...tokenHeaderAllowlist,
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Credentials',
    ],
  });

  await app.register(cookie, {
    secret: ENVIRONMENT.jwt.secret,
  });

  await app.register(rateLimit, {
    max: ENVIRONMENT.rateLimit.max,
    timeWindow: ENVIRONMENT.rateLimit.timeWindow,
  });

  // Liveness/readiness (unversioned for probes)
  await app.register(registerHealthRoutes);

  // Versioned business API
  await app.register(registerAuthRoutes, { prefix: `${API_V1_PREFIX}/auth` });
  await app.register(registerUploadRoutes, { prefix: `${API_V1_PREFIX}/upload` });
  await app.register(registerAdminUploadRoutes, { prefix: `${API_V1_PREFIX}/admin/upload` });
  await app.register(registerDocumentRoutes, { prefix: `${API_V1_PREFIX}/documents` });
  await app.register(registerAdminDocumentRoutes, { prefix: `${API_V1_PREFIX}/admin/documents` });
  await app.register(registerAdminEmailLogRoutes, { prefix: `${API_V1_PREFIX}/admin/email-logs` });
  await app.register(registerAdminContactSubmissionRoutes, {
    prefix: `${API_V1_PREFIX}/admin/contact-submissions`,
  });
  await app.register(registerNotificationRoutes, { prefix: `${API_V1_PREFIX}/notifications` });
  await app.register(registerSiteSettingsRoutes, { prefix: `${API_V1_PREFIX}/site-settings` });
  await app.register(registerAdminSiteSettingsRoutes, {
    prefix: `${API_V1_PREFIX}/admin/site-settings`,
  });
  await app.register(registerMarketplaceRoutes, { prefix: `${API_V1_PREFIX}/marketplace` });
  await app.register(registerUserRoutes, { prefix: `${API_V1_PREFIX}/user` });
  await app.register(registerVendorRoutes, { prefix: `${API_V1_PREFIX}/vendor` });
  await app.register(registerArtistRoutes, { prefix: `${API_V1_PREFIX}/artist` });
  await app.register(registerPublicRoutes, { prefix: `${API_V1_PREFIX}/public` });
  await app.register(registerAdminPromotionRoutes, { prefix: `${API_V1_PREFIX}/admin` });
  await app.register(registerAdminContentRoutes, { prefix: `${API_V1_PREFIX}/admin` });
  await app.register(registerAdminProfileRoutes, { prefix: `${API_V1_PREFIX}/admin` });

  app.setErrorHandler(errorHandler);

  // Not found handler
  app.setNotFoundHandler((request, reply) => {
    sendErrorResponse(reply, 404, `Route ${request.method} ${request.url} not found`);
  });

  return app;
};
