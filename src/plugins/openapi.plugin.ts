import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { API_V1_PREFIX } from '../constants/apiVersion';
import { ENVIRONMENT } from '../config/env';
import { wrapRootPlugin } from './wrapPlugin';

async function openapiPlugin(app: FastifyInstance): Promise<void> {
  if (ENVIRONMENT.nodeEnv === 'production' && process.env.OPENAPI_ENABLED !== 'true') {
    return;
  }

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'OJ Multimedia API',
        version: '1.0.0',
      },
      servers: [{ url: API_V1_PREFIX }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });
}

export const ojOpenapiPlugin = wrapRootPlugin(openapiPlugin, 'oj-openapi-plugin');
