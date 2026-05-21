import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ENVIRONMENT } from '../config/env';
import { buildRequestCompletedLogFields } from '../observability/requestMetrics';
import { wrapRootPlugin } from './wrapPlugin';

// eslint-disable-next-line @typescript-eslint/require-await
async function observabilityPlugin(app: FastifyInstance): Promise<void> {
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const durationMs = reply.elapsedTime;

    if (durationMs == null || Number.isNaN(durationMs)) {
      return;
    }

    const route = request.routeOptions?.url ?? request.url;

    request.log.info(
      buildRequestCompletedLogFields({
        requestId: String(request.id),
        method: request.method,
        route,
        statusCode: reply.statusCode,
        durationMs,
      }),
      'request completed'
    );
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
