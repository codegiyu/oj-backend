import type { FastifyRequest, FastifyReply } from 'fastify';

type AsyncRouteHandler<R extends FastifyRequest = FastifyRequest> = (
  request: R,
  reply: FastifyReply
) => Promise<void>;

/** Generic route handler compatible with Fastify's RouteHandlerMethod */
type GenericRouteHandler = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<void>;

/**
 * Wraps an async route handler so any thrown errors or rejected promises
 * are passed to Fastify's error handler. No try/catch needed in the callback.
 * Returns a handler typed for generic FastifyRequest so it can be used with any route.
 */
export const catchAsync = <R extends FastifyRequest = FastifyRequest>(
  fn: AsyncRouteHandler<R>
): GenericRouteHandler => {
  return (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    return Promise.resolve(fn(request as R, reply));
  };
};
