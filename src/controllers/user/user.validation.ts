import type { FastifySchema } from 'fastify';

export const updateMeBodySchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      phoneNumber: { type: 'string' },
      avatar: { type: 'string' },
    },
  },
};

export const addToWishlistBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['productId'],
    properties: {
      productId: { type: 'string' },
    },
  },
};

export const listWishlistQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      search: { type: 'string' },
      sort: { type: 'string' },
    },
  },
};

export const wishlistProductIdParamSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['productId'],
    properties: {
      productId: { type: 'string' },
    },
  },
};

export const cartBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['productId', 'quantity'],
    properties: {
      productId: { type: 'string' },
      quantity: { type: 'number', minimum: 1 },
      sku: { type: 'string' },
    },
  },
};

export const updateCartBodySchema: FastifySchema = {
  body: {
    type: 'object',
    oneOf: [
      {
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'number' },
        },
      },
      {
        required: ['updates'],
        properties: {
          updates: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['productId', 'quantity'],
              properties: {
                productId: { type: 'string' },
                quantity: { type: 'number' },
              },
            },
          },
        },
      },
    ],
  },
};

export const cartProductIdParamSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['productId'],
    properties: {
      productId: { type: 'string' },
    },
  },
};

