import type { FastifySchema } from 'fastify';

export const adminUpdateMeBodySchema: FastifySchema = {
  body: {
    type: 'object',
    properties: {
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      avatar: { type: 'string' },
    },
  },
};
