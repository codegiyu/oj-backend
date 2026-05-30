import type { FastifyRequest, FastifyReply } from 'fastify';

export type AsyncRouteHandler<R extends FastifyRequest = FastifyRequest> = (
  request: R,
  reply: FastifyReply
) => Promise<void>;

/**
 * Wraps an async route handler so any thrown errors or rejected promises
 * are passed to Fastify's error handler. No try/catch needed in the callback.
 * Returns a sync handler so route registration satisfies `@typescript-eslint/no-misused-promises`.
 */
export const catchAsync = <R extends FastifyRequest = FastifyRequest>(
  fn: AsyncRouteHandler<R>
): ((request: FastifyRequest, reply: FastifyReply) => void) => {
  return (request: FastifyRequest, reply: FastifyReply): void => {
    fn(request as R, reply).catch((err: unknown) => {
      if (!reply.sent) {
        void reply.send(err);
      }
    });
  };
};
