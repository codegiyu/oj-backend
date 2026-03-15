import type { FastifyRequest } from 'fastify';
import type { AuthUser } from '../lib/types/constants';

export function getAuthUser(request: FastifyRequest): AuthUser | undefined {
  return request.authUser;
}
