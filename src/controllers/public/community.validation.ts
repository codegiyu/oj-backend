import type { FastifySchema } from 'fastify';

const DEVOTIONAL_TYPES = [
  'daily',
  'latest',
  'popular',
  'bible-study',
  'prayer-points',
  'living-tips',
  'marriage-family',
] as const;
const TESTIMONY_TYPES = ['all', 'featured', 'latest'] as const;
const PRAYER_STATUS = ['active', 'answered'] as const;
const QUESTION_STATUS = ['active', 'answered'] as const;
const POLL_STATUS = ['active', 'closed'] as const;
const RESOURCE_TYPES = ['ebook', 'template', 'beat', 'wallpaper', 'affiliate'] as const;

const idOrSlugParam = {
  params: {
    type: 'object',
    required: ['idOrSlug'],
    properties: { idOrSlug: { type: 'string', minLength: 1 } },
  },
} as const;

const baseListQuerystring = {
  category: { type: 'string' },
  page: { type: 'string', pattern: '^[0-9]+$' },
  limit: { type: 'string', pattern: '^[0-9]+$' },
  status: { type: 'string' },
  type: { type: 'string' },
};

/** Shared list schema for devotionals, testimonies, etc. when no enum is needed. */
export const communityListQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: baseListQuerystring,
  },
};

export const listDevotionalsQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      ...baseListQuerystring,
      type: { type: 'string', enum: [...DEVOTIONAL_TYPES] },
      status: { type: 'string', enum: ['published'] },
    },
  },
};

export const listTestimoniesQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      ...baseListQuerystring,
      type: { type: 'string', enum: [...TESTIMONY_TYPES] },
      status: { type: 'string', enum: ['published'] },
    },
  },
};

export const listPrayerRequestsQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      status: { type: 'string', enum: [...PRAYER_STATUS] },
    },
  },
};

export const listAskAPastorQuestionsQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      status: { type: 'string', enum: [...QUESTION_STATUS] },
    },
  },
};

export const listPollsQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      status: { type: 'string', enum: [...POLL_STATUS] },
    },
  },
};

export const listArtistsQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
    },
  },
};

export const listPastorsQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
    },
  },
};

export const listResourcesQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      type: { type: 'string', enum: [...RESOURCE_TYPES] },
    },
  },
};

export const communityIdOrSlugParamSchema: FastifySchema = idOrSlugParam;

/** Submit prayer request: title/content required; name max 200, title max 200, content max 2000. */
export const submitPrayerRequestBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['title', 'content'],
    properties: {
      name: { type: 'string', maxLength: 200 },
      email: { type: 'string', format: 'email' },
      title: { type: 'string', maxLength: 200 },
      content: { type: 'string', maxLength: 2000 },
      category: { type: 'string' },
      urgent: { type: 'boolean' },
    },
  },
};

/** Submit question: question required, max 2000; name max 200. */
export const submitQuestionBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['question'],
    properties: {
      name: { type: 'string', maxLength: 200 },
      email: { type: 'string', format: 'email' },
      question: { type: 'string', maxLength: 2000 },
      category: { type: 'string' },
    },
  },
};

/** Submit testimony: content required, max 5000; name max 200. */
export const submitTestimonyBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['content'],
    properties: {
      name: { type: 'string', maxLength: 200 },
      category: { type: 'string' },
      content: { type: 'string', maxLength: 5000 },
    },
  },
};

/** Create poll: question and options (2–6) required. */
export const createPollBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['question', 'options'],
    properties: {
      question: { type: 'string' },
      description: { type: 'string' },
      category: { type: 'string' },
      options: {
        type: 'array',
        items: { type: 'string' },
        minItems: 2,
        maxItems: 6,
      },
    },
  },
};

/** Vote on poll: optionId required; params.idOrSlug required. */
export const votePollBodySchema: FastifySchema = {
  ...idOrSlugParam,
  body: {
    type: 'object',
    required: ['optionId'],
    properties: { optionId: { type: 'string', minLength: 1 } },
  },
};
