import { CONTENT_CATEGORY_SCOPES } from '@/lib/types/constants';
import type { FastifySchema } from 'fastify';

const MUSIC_TYPES = ['trending', 'featured', 'recent', 'charts'] as const;
const MUSIC_PERIOD = ['weekly', 'monthly', 'alltime'] as const;
const VIDEO_TYPES = ['trending', 'featured', 'recent', 'short-form'] as const;
const NEWS_TYPES = ['featured', 'trending', 'latest', 'video'] as const;

export const listPublicMusicQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      excludeCategory: { type: 'string' },
      artist: { type: 'string' },
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      status: { type: 'string', enum: ['published'] },
      type: { type: 'string', enum: [...MUSIC_TYPES] },
      period: { type: 'string', enum: [...MUSIC_PERIOD] },
    },
  },
};

export const listPublicVideosQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      artist: { type: 'string' },
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      status: { type: 'string', enum: ['published'] },
      type: { type: 'string', enum: [...VIDEO_TYPES] },
    },
  },
};

export const listPublicNewsQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      category: { type: 'string' },
      page: { type: 'string', pattern: '^[0-9]+$' },
      limit: { type: 'string', pattern: '^[0-9]+$' },
      status: { type: 'string', enum: ['published'] },
      type: { type: 'string', enum: [...NEWS_TYPES] },
    },
  },
};

/** idOrSlug: MongoDB ObjectId (24 hex) or any non-empty string slug */
export const idOrSlugParamSchema: FastifySchema = {
  params: {
    type: 'object',
    required: ['idOrSlug'],
    properties: { idOrSlug: { type: 'string', minLength: 1 } },
  },
};

export const listPublicContentCategoriesQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      scope: {
        type: 'string',
        enum: CONTENT_CATEGORY_SCOPES,
      },
    },
  },
};

export const contentAnalyticsEventBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['entityType', 'entityIdOrSlug', 'event'],
    properties: {
      entityType: { type: 'string', enum: ['music', 'video', 'devotional', 'news-article'] },
      entityIdOrSlug: { type: 'string', minLength: 1 },
      event: { type: 'string', enum: ['view', 'play', 'download'] },
      clientSessionId: { type: 'string' },
    },
  },
};
