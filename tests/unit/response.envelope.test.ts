import { describe, expect, it } from 'vitest';
import {
  defaultEnvelopeDataSchema,
  errorEnvelopeResponseSchema,
  successEnvelopeResponseSchema,
} from '../../src/schemas/response.envelope';

describe('response.envelope schemas', () => {
  it('defines required success envelope fields', () => {
    expect(successEnvelopeResponseSchema(200, { type: 'object' })).toEqual({
      200: {
        type: 'object',
        required: ['success', 'data', 'responseCode', 'message'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          responseCode: { type: 'number' },
          message: { type: 'string' },
          data: { type: 'object' },
        },
      },
    });
  });

  it('uses additionalProperties on default data schema so serializers keep payload keys', () => {
    expect(defaultEnvelopeDataSchema).toEqual({
      type: ['object', 'array', 'null'],
      additionalProperties: true,
    });

    expect(successEnvelopeResponseSchema(200)).toEqual({
      200: {
        type: 'object',
        required: ['success', 'data', 'responseCode', 'message'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          responseCode: { type: 'number' },
          message: { type: 'string' },
          data: { ...defaultEnvelopeDataSchema },
        },
      },
    });
  });

  it('defines required error envelope fields for 400', () => {
    expect(errorEnvelopeResponseSchema[400]).toEqual({
      type: 'object',
      required: ['success', 'responseCode', 'message'],
      properties: {
        success: { type: 'boolean', enum: [false] },
        responseCode: { type: 'number' },
        message: { type: 'string' },
        data: { type: ['object', 'null'] },
      },
    });
  });
});
