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

const GENERIC_SERVER_ERROR_MESSAGE = 'An unexpected error occurred. Please try again later.';

function isOperationalAppError(error: unknown): error is AppError {
  if (error instanceof AppError) {
    return true;
  }

  return (
    typeof error === 'object' &&
    error !== null &&
    'isOperational' in error &&
    (error as AppError).isOperational === true &&
    typeof (error as AppError).statusCode === 'number'
  );
}

function buildValidationDetails(
  validation: ValidationErrorItem[]
): Array<{ message?: string; path?: string }> {
  return validation.map(v => ({
    message: v.message,
    path: [v.instancePath, v.params?.missingProperty, v.params?.propertyName].find(
      x => x != null
    ) as string | undefined,
  }));
}

export function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply): void {
  const err = error as ErrorWithValidation;
  const statusCode = isOperationalAppError(error) ? error.statusCode : (err.statusCode ?? 500);
  const internalMessage = error instanceof Error ? error.message : 'Internal Server Error';

  if (err.code === 'FST_ERR_VALIDATION') {
    const details =
      err.validation && err.validation.length > 0
        ? buildValidationDetails(err.validation)
        : undefined;
    logger.warn('Validation error:', {
      message: internalMessage,
      url: request.url,
      method: request.method,
      details,
    });
    const data =
      details && details.length > 0
        ? ({ details } as unknown as Record<string, unknown>)
        : undefined;
    sendErrorResponse(reply, 400, internalMessage, data);
    return;
  }

  logger.error('Request error:', {
    error: internalMessage,
    stack: error instanceof Error ? error.stack : undefined,
    url: request.url,
    method: request.method,
  });

  const isAppError = isOperationalAppError(error);
  const clientMessage = isAppError
    ? internalMessage
    : ENVIRONMENT.nodeEnv === 'production'
      ? GENERIC_SERVER_ERROR_MESSAGE
      : internalMessage;

  const errorData: unknown =
    isAppError && error.data !== undefined
      ? error.data
      : ENVIRONMENT.nodeEnv === 'development' && error instanceof Error && error.stack
        ? { stack: error.stack }
        : undefined;
  sendErrorResponse(reply, statusCode, clientMessage, errorData);
}
