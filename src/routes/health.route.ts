import { FastifyInstance } from 'fastify';
import { health } from '../controllers/health/health.controller';

export const registerHealthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/health', health);
};
