import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ENVIRONMENT } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import { sendErrorResponse } from '../utils/response';

type ValidationErrorItem = {
  message?: string;
  params?: Record<string, unknown>;
  instancePath?: string;
};

type ErrorWithValidation = FastifyError & {
  validation?: ValidationErrorItem[];
};

function buildValidationDetails(validation: ValidationErrorItem[]): Array<{ message?: string; path?: string }> {
  return validation.map((v) => ({
    message: v.message,
    path: [v.instancePath, v.params?.missingProperty, v.params?.propertyName]
      .find((x) => x != null) as string | undefined,
  }));
}

export function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const err = error as ErrorWithValidation;
  const statusCode = error instanceof AppError ? error.statusCode : err.statusCode ?? 500;
  const message = error instanceof Error ? error.message : 'Internal Server Error';

  if (err.code === 'FST_ERR_VALIDATION') {
    const details =
      err.validation && err.validation.length > 0
        ? buildValidationDetails(err.validation)
        : undefined;
    logger.warn('Validation error:', {
      message,
      url: request.url,
      method: request.method,
      details,
    });
    const data =
      details && details.length > 0 ? ({ details } as Record<string, unknown>) : undefined;
    sendErrorResponse(reply, 400, message, data);
    return;
  }

  logger.error('Request error:', {
    error: message,
    stack: error instanceof Error ? error.stack : undefined,
    url: request.url,
    method: request.method,
  });
  const errorData: unknown =
    error instanceof AppError && error.data !== undefined
      ? error.data
      : ENVIRONMENT.nodeEnv === 'development' && error instanceof Error && error.stack
        ? { stack: error.stack }
        : undefined;
  sendErrorResponse(reply, statusCode, message, errorData);
}
