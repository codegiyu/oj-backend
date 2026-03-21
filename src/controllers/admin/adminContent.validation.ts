import type { FastifySchema } from 'fastify';

/** Params schema for routes with :id */
export const idParamSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', minLength: 1 } },
  },
};

const listQuerystringProperties = {
  page: { type: 'string', pattern: '^[0-9]+$' },
  limit: { type: 'string', pattern: '^[0-9]+$' },
  search: { type: 'string' },
  status: { type: 'string' },
  sort: { type: 'string' },
};

/** Querystring for list endpoints (music, videos, news, devotionals, etc.) */
export const listAdminQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: listQuerystringProperties,
  },
};

/** Querystring for products and orders (includes vendor filter) */
export const listAdminQuerystringWithVendorSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      ...listQuerystringProperties,
      vendor: { type: 'string' },
    },
  },
};

/** Body for reject actions (reason required) */
export const rejectBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['reason'],
    properties: { reason: { type: 'string', minLength: 1 } },
    additionalProperties: false,
  },
};

/** Body for prayer request answer */
export const answerPrayerRequestBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['answer'],
    properties: { answer: { type: 'string', minLength: 1 } },
    additionalProperties: false,
  },
};

/** Body for assign-pastor action */
export const assignPastorBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['pastorId'],
    properties: { pastorId: { type: 'string', minLength: 1 } },
    additionalProperties: false,
  },
};

/** Body for close poll (reason optional) */
export const closePollBodySchema: FastifySchema = {
  body: {
    type: 'object',
    properties: { reason: { type: 'string' } },
    additionalProperties: false,
  },
};

/** Generic body schema for create/update - ensures body is an object. Controllers validate specific fields. */
export const createUpdateBodySchema: FastifySchema = {
  body: {
    type: 'object',
    minProperties: 0,
  },
};
