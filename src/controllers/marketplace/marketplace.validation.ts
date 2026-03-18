import type { FastifySchema } from 'fastify';

export const listOrdersQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      status: { type: 'string' },
      search: { type: 'string' },
      sort: { type: 'string' },
    },
  },
};

export const listProductsQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      category: { type: 'string' }, // category slug
      subCategory: { type: 'string' }, // subcategory slug
      featured: { type: 'string', enum: ['true', 'false'] },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      page: { type: 'string', pattern: '^[0-9]+$' },
      search: { type: 'string' },
      q: { type: 'string' },
      sort: { type: 'string' },
    },
  },
};

export const becomeVendorBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['storeName', 'email', 'phone'],
    properties: {
      storeName: { type: 'string' },
      storeDescription: { type: 'string' },
      email: { type: 'string', format: 'email' },
      phone: { type: 'string' },
      whatsapp: { type: 'string' },
      address: { type: 'string' },
      bankAccountName: { type: 'string' },
      bankAccountNumber: { type: 'string' },
      bankName: { type: 'string' },
    },
  },
};

export const placeOrderBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['customer', 'items'],
    properties: {
      customer: {
        type: 'object',
        required: ['name', 'email', 'phone'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          address: { type: 'string' },
        },
      },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['productId', 'quantity', 'price'],
          properties: {
            productId: { type: 'string' },
            productName: { type: 'string' },
            quantity: { type: 'number', minimum: 1 },
            price: { type: 'number', minimum: 0 },
            sku: { type: 'string' },
          },
        },
      },
    },
  },
};
