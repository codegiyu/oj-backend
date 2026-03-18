import type { FastifySchema } from 'fastify';

export const submitContactBodySchema: FastifySchema = {
  body: {
    type: 'object',
    required: ['name', 'phone', 'subject', 'message'],
    properties: {
      name: { type: 'string', maxLength: 200 },
      phone: { type: 'string', maxLength: 50 },
      email: { type: 'string', format: 'email', maxLength: 320 },
      subject: { type: 'string', maxLength: 200 },
      message: { type: 'string', minLength: 10, maxLength: 5000 },
    },
  },
};
