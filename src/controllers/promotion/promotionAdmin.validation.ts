import type { FastifySchema } from 'fastify';

const paginationQuery = {
  type: 'object',
  properties: {
    page: { type: 'string', pattern: '^[0-9]+$' },
    limit: { type: 'string', pattern: '^[0-9]+$' },
    includeInactive: { type: 'string', enum: ['true', 'false'] },
  },
} as const;

export const idParamSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string', minLength: 1 } },
  },
};

export const listPromotionItemsQuerystringSchema: FastifySchema = {
  querystring: paginationQuery,
};

export const createFeaturedOptionBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['title', 'duration', 'price', 'description', 'features', 'icon'],
    properties: {
      title: { type: 'string' },
      duration: { type: 'string' },
      price: { type: 'string' },
      description: { type: 'string' },
      features: { type: 'array', items: { type: 'string' }, minItems: 1 },
      icon: { type: 'string' },
      displayOrder: { type: 'number' },
      isActive: { type: 'boolean' },
    },
  },
};

export const updateFeaturedOptionBodySchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      duration: { type: 'string' },
      price: { type: 'string' },
      description: { type: 'string' },
      features: { type: 'array', items: { type: 'string' }, minItems: 1 },
      icon: { type: 'string' },
      displayOrder: { type: 'number' },
      isActive: { type: 'boolean' },
    },
    additionalProperties: false,
  },
};

export const createPromotionPricingOptionBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['title', 'price', 'description', 'features'],
    properties: {
      title: { type: 'string' },
      price: { type: 'string' },
      description: { type: 'string' },
      features: { type: 'array', items: { type: 'string' }, minItems: 1 },
      isFeatured: { type: 'boolean' },
      displayOrder: { type: 'number' },
      isActive: { type: 'boolean' },
    },
  },
};

export const updatePromotionPricingOptionBodySchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      price: { type: 'string' },
      description: { type: 'string' },
      features: { type: 'array', items: { type: 'string' }, minItems: 1 },
      isFeatured: { type: 'boolean' },
      displayOrder: { type: 'number' },
      isActive: { type: 'boolean' },
    },
    additionalProperties: false,
  },
};

export const createResourceDownloadCategoryBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['title', 'count', 'description', 'icon', 'href'],
    properties: {
      title: { type: 'string' },
      count: { type: 'string' },
      description: { type: 'string' },
      icon: { type: 'string' },
      href: { type: 'string' },
      displayOrder: { type: 'number' },
      isActive: { type: 'boolean' },
    },
  },
};

export const updateResourceDownloadCategoryBodySchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      count: { type: 'string' },
      description: { type: 'string' },
      icon: { type: 'string' },
      href: { type: 'string' },
      displayOrder: { type: 'number' },
      isActive: { type: 'boolean' },
    },
    additionalProperties: false,
  },
};

export const createContactMethodBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['method', 'value', 'action', 'icon'],
    properties: {
      method: { type: 'string' },
      value: { type: 'string' },
      action: { type: 'string' },
      icon: { type: 'string' },
      displayOrder: { type: 'number' },
      isActive: { type: 'boolean' },
    },
  },
};

export const updateContactMethodBodySchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      method: { type: 'string' },
      value: { type: 'string' },
      action: { type: 'string' },
      icon: { type: 'string' },
      displayOrder: { type: 'number' },
      isActive: { type: 'boolean' },
    },
    additionalProperties: false,
  },
};

export const createPartnershipBenefitBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['text'],
    properties: {
      text: { type: 'string' },
      displayOrder: { type: 'number' },
      isActive: { type: 'boolean' },
    },
  },
};

export const updatePartnershipBenefitBodySchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      text: { type: 'string' },
      displayOrder: { type: 'number' },
      isActive: { type: 'boolean' },
    },
    additionalProperties: false,
  },
};
