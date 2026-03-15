import type { FastifySchema } from 'fastify';

const idOrSlugParam = {
  params: {
    type: 'object',
    required: ['idOrSlug'],
    properties: { idOrSlug: { type: 'string', minLength: 1 } },
  },
} as const;

const listQuery = {
  querystring: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      status: { type: 'string' },
      type: { type: 'string' },
    },
  },
} as const;

export const communityListQuerystringSchema: FastifySchema = listQuery;
export const communityIdOrSlugParamSchema: FastifySchema = idOrSlugParam;

export const submitPrayerRequestBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['title', 'content'],
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      title: { type: 'string' },
      content: { type: 'string' },
      category: { type: 'string' },
      urgent: { type: 'boolean' },
    },
  },
};

export const submitQuestionBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['question'],
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
      question: { type: 'string' },
      category: { type: 'string' },
    },
  },
};

export const submitTestimonyBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['content'],
    properties: {
      name: { type: 'string' },
      category: { type: 'string' },
      content: { type: 'string' },
    },
  },
};

export const createPollBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['question', 'options'],
    properties: {
      question: { type: 'string' },
      description: { type: 'string' },
      category: { type: 'string' },
      options: { type: 'array', items: { type: 'string' }, minItems: 2 },
    },
  },
};

export const votePollBodySchema: FastifySchema = {
  ...idOrSlugParam,
  body: {
    type: 'object',
    required: ['optionId'],
    properties: { optionId: { type: 'string' } },
  },
};
