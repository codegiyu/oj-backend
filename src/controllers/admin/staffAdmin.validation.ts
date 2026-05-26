import type { FastifySchema } from 'fastify';

export const adminStaffListQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      search: { type: 'string' },
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      status: { type: 'string' },
      sort: { type: 'string' },
    },
  },
};

export const adminStaffInviteBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['email', 'firstName', 'lastName'],
    properties: {
      email: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      roleSlug: { type: 'string', enum: ['admin', 'super-admin'] },
      permissions: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    additionalProperties: false,
  },
};

export const adminStaffIdParamSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string' },
    },
  },
};
