import type { FastifySchema } from 'fastify';

/**
 * Workspace validation strategy (Phase 6): keep Fastify JSON Schema for request validation
 * and document success/error envelopes here. Zod is not used to avoid dual validation stacks.
 */

/** JSON Schema object describing a single envelope response body. */
export type EnvelopeBodySchema = {
  type: 'object';
  required: readonly string[];
  properties: Record<string, unknown>;
};

/** Status-keyed JSON Schema map used for documented API response envelopes. */
export type StatusKeyedResponseSchema = Record<number, EnvelopeBodySchema>;

/** Default payload schema: allow arbitrary handler fields (music, pagination, etc.). */
export const defaultEnvelopeDataSchema = {
  type: ['object', 'array', 'null'],
  additionalProperties: true,
} as const;

const errorEnvelopeBody = {
  type: 'object',
  required: ['success', 'responseCode', 'message'],
  properties: {
    success: { type: 'boolean', enum: [false] },
    responseCode: { type: 'number' },
    message: { type: 'string' },
    data: { type: ['object', 'null'] },
  },
} as const;

export function successEnvelopeResponseSchema<S extends 200 | 201>(
  statusCode: S,
  dataSchema: Record<string, unknown> = { ...defaultEnvelopeDataSchema }
): Record<S, EnvelopeBodySchema> {
  const body: EnvelopeBodySchema = {
    type: 'object',
    required: ['success', 'data', 'responseCode', 'message'],
    properties: {
      success: { type: 'boolean', enum: [true] },
      responseCode: { type: 'number' },
      message: { type: 'string' },
      data: dataSchema,
    },
  };

  return { [statusCode]: body } as Record<S, EnvelopeBodySchema>;
}

const errorEnvelopeBodies = {
  400: errorEnvelopeBody,
  401: errorEnvelopeBody,
  403: errorEnvelopeBody,
  404: errorEnvelopeBody,
  500: errorEnvelopeBody,
} satisfies StatusKeyedResponseSchema;

export const errorEnvelopeResponseSchema = errorEnvelopeBodies;

/** Attach success envelope only; errors stay handled by AppError / sendErrorResponse. */
export function withSuccessEnvelope(
  schema: FastifySchema,
  statusCode: 200 | 201 = 200,
  dataSchema?: Record<string, unknown>
): FastifySchema {
  return {
    ...schema,
    response: successEnvelopeResponseSchema(statusCode, dataSchema),
  };
}
