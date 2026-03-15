import { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { ENVIRONMENT } from '../config/env';

export const registerJwtPlugin = async (fastify: FastifyInstance): Promise<void> => {
  await fastify.register(fastifyJwt, {
    secret: ENVIRONMENT.jwt.secret,
    sign: {
      expiresIn: ENVIRONMENT.jwt.expiresIn,
    },
  });
};
