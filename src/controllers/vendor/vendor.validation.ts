import type { FastifySchema } from 'fastify';

export const createProductBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['name', 'price'],
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      category: { type: ['string', 'null'] },
      subCategory: { type: ['string', 'null'] },
      tags: {
        type: 'array',
        items: { type: 'string' },
      },
      price: { type: 'number', minimum: 0 },
      images: { type: 'array', items: { type: 'string' } },
      inStock: { type: 'boolean' },
      isFeatured: { type: 'boolean' },
      variationOptions: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'values'],
          properties: {
            name: { type: 'string' },
            values: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      variants: {
        type: 'array',
        items: {
          type: 'object',
          required: ['options', 'price', 'inStock'],
          properties: {
            options: { type: 'object' },
            price: { type: 'number', minimum: 0 },
            inStock: { type: 'boolean' },
            isDefault: { type: 'boolean' },
            sku: { type: 'string' },
            image: { type: 'string' },
          },
        },
      },
    },
  },
};

export const updateProductBodySchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['productId'],
    properties: { productId: { type: 'string' } },
  },
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      category: { type: ['string', 'null'] },
      subCategory: { type: ['string', 'null'] },
      tags: {
        type: 'array',
        items: { type: 'string' },
      },
      price: { type: 'number', minimum: 0 },
      images: { type: 'array', items: { type: 'string' } },
      inStock: { type: 'boolean' },
      status: { type: 'string', enum: ['draft', 'published', 'archived'] },
      isFeatured: { type: 'boolean' },
      variationOptions: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'values'],
          properties: {
            name: { type: 'string' },
            values: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      variants: {
        type: 'array',
        items: {
          type: 'object',
          required: ['options', 'price', 'inStock'],
          properties: {
            options: { type: 'object' },
            price: { type: 'number', minimum: 0 },
            inStock: { type: 'boolean' },
            isDefault: { type: 'boolean' },
            sku: { type: 'string' },
            image: { type: 'string' },
          },
        },
      },
    },
  },
};

export const updateVendorSettingsBodySchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      storeName: { type: 'string' },
      storeDescription: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' },
      logo: { type: 'string' },
      coverImage: { type: 'string' },
      whatsapp: { type: 'string' },
      address: { type: 'string' },
      bankAccountName: { type: 'string' },
      bankAccountNumber: { type: 'string' },
      bankName: { type: 'string' },
    },
  },
};
