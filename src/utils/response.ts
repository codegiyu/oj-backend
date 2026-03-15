import { FastifyReply } from 'fastify';

export function sendResponse(
  reply: FastifyReply,
  statusCode: number = 200,
  data: Record<string, unknown> | string | null,
  message: string
): void {
  reply.status(statusCode).send({
    success: true,
    data,
    responseCode: statusCode,
    message: message ?? 'Success',
  });
}
