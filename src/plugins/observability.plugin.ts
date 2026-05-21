import type { FastifyInstance } from 'fastify';
import { ENVIRONMENT } from '../config/env';
import { wrapRootPlugin } from './wrapPlugin';

// eslint-disable-next-line @typescript-eslint/require-await
async function observabilityPlugin(app: FastifyInstance): Promise<void> {
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  if (ENVIRONMENT.nodeEnv !== 'development') {
    return;
  }

  app.addHook('onRequest', (request, _reply, done) => {
    request.log.debug(
      {
        hasAuthorizationHeader: typeof request.headers.authorization === 'string',
        authorizationIsBearer:
          typeof request.headers.authorization === 'string' &&
          request.headers.authorization.startsWith('Bearer '),
        hasCookieHeader: typeof request.headers.cookie === 'string',
        hasOriginHeader: typeof request.headers.origin === 'string',
        hasRefererHeader: typeof request.headers.referer === 'string',
        userAgentPresent: typeof request.headers['user-agent'] === 'string',
      },
      'HTTP ingress headers snapshot'
    );
    done();
  });
}

export const ojObservabilityPlugin = wrapRootPlugin(observabilityPlugin, 'oj-observability-plugin');
