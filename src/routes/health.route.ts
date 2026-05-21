import { FastifyInstance } from 'fastify';
import { health, ready } from '../controllers/health/health.controller';
import { catchAsync } from '../utils/catchAsync';

// eslint-disable-next-line @typescript-eslint/require-await
export const registerHealthRoutes = async (fastify: FastifyInstance): Promise<void> => {
  fastify.get('/health', health);
  fastify.get('/ready', catchAsync(ready));
};
