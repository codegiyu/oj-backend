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
  category: { type: 'string' },
  artist: { type: 'string' },
  scope: { type: 'string' },
  slot: { type: 'string' },
  type: { type: 'string' },
  entityType: { type: 'string' },
  intent: { type: 'string' },
  startDate: { type: 'string' },
  endDate: { type: 'string' },
  isActive: { type: 'string' },
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

/** Album list — artist filter in addition to standard params */
export const listAdminQuerystringWithArtistSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: listQuerystringProperties,
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

/** GET /admin/users — search (no page) or paginated list (page present) */
export const adminUsersQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      search: { type: 'string' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      page: { type: 'string', pattern: '^[0-9]+$' },
      status: { type: 'string' },
      sort: { type: 'string' },
    },
  },
};

/** PATCH /admin/users/:id */
export const adminUserPatchBodySchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      accountStatus: { type: 'string' },
      suspensionReason: { type: 'string' },
      artistId: { type: ['string', 'null'] },
      vendorId: { type: ['string', 'null'] },
    },
    additionalProperties: false,
  },
};

/** @deprecated use adminUsersQuerystringSchema */
export const adminUsersSearchQuerystringSchema = adminUsersQuerystringSchema;

export const updateAdminOrderBodySchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', minLength: 1 } },
  },
  body: {
    type: 'object',
    minProperties: 1,
    properties: {
      status: {
        type: 'string',
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      },
      paymentStatus: {
        type: 'string',
        enum: ['pending', 'paid', 'failed', 'refunded'],
      },
    },
  },
};
