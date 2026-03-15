import { FastifyRequest, FastifyReply } from 'fastify';

type AsyncRouteHandler<R extends FastifyRequest = FastifyRequest> = (
  request: R,
  reply: FastifyReply
) => Promise<void>;

/**
 * Wraps an async route handler so any thrown errors or rejected promises
 * are passed to Fastify's error handler. No try/catch needed in the callback.
 */
export const catchAsync = <R extends FastifyRequest = FastifyRequest>(
  fn: AsyncRouteHandler<R>
): ((request: R, reply: FastifyReply) => Promise<void>) => {
  return (request: R, reply: FastifyReply): Promise<void> => {
    return Promise.resolve(fn(request, reply));
  };
};
