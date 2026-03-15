import { FastifyReply } from 'fastify';

/** Standard success envelope: { success: true, data, responseCode, message }. Use for all success responses. */
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

/** Standard error envelope: { success: false, data?, responseCode, message }. Use only in error handler and not-found handler; elsewhere throw AppError. */
export function sendErrorResponse(
  reply: FastifyReply,
  statusCode: number,
  message: string,
  data?: unknown
): void {
  reply.status(statusCode).send({
    success: false,
    data: data ?? null,
    responseCode: statusCode,
    message,
  });
}
