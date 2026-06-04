import type { FastifySchema } from 'fastify';

export const roleProfileTypeIdParamsSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['profileType', 'id'],
    properties: {
      profileType: { type: 'string', enum: ['vendor', 'artist', 'pastor'] },
      id: { type: 'string', minLength: 1 },
    },
  },
};

export const suspendRoleProfileBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['reason'],
    properties: {
      reason: { type: 'string', minLength: 1, maxLength: 2000 },
    },
    additionalProperties: false,
  },
};

export const rejectAppealBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['adminResponse'],
    properties: {
      adminResponse: { type: 'string', minLength: 1, maxLength: 2000 },
    },
    additionalProperties: false,
  },
};
