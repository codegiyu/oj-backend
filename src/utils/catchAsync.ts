import { FastifyRequest, FastifyReply } from 'fastify';

type AsyncRouteHandler<R extends FastifyRequest = FastifyRequest> = (
  request: R,
  reply: FastifyReply
) => Promise<void | FastifyReply>;

export const catchAsync = <R extends FastifyRequest = FastifyRequest>(
  fn: AsyncRouteHandler<R>
): ((request: R, reply: FastifyReply) => void) => {
  return (request: R, reply: FastifyReply): void => {
    Promise.resolve(fn(request, reply)).catch((err) => {
      reply.send(err);
    });
  };
};
