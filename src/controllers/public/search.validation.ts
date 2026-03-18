import type { FastifySchema } from 'fastify';

const SEARCH_TYPES = [
  'music',
  'news',
  'video',
  'community', // expands to all community content types (devotionals, testimonies, etc.)
  'devotional',
  'testimony',
  'prayer-request',
  'question',
  'poll',
  'resource',
  'artist',
] as const;

/** q optional (empty returns empty results); type, page, limit optional with backend defaults; invalid page/limit fall back to 1 and 24. */
export const searchQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {
      q: { type: 'string' },
      type: { type: 'string', enum: [...SEARCH_TYPES] },
      page: { type: 'string' },
      limit: { type: 'string' },
    },
  },
};
