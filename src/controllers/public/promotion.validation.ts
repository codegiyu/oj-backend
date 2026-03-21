import type { FastifySchema } from 'fastify';

export const promotionPublicListQuerystringSchema: FastifySchema = {
  querystring: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
};
