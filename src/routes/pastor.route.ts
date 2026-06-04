import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import {
  getPastorMe,
  deactivatePastorMe,
  reactivatePastorMe,
  submitPastorAppeal,
  submitPastorApplication,
  getPastorProfile,
  updatePastorProfile,
  getPastorDashboardStats,
  listPastorQuestions,
  getPastorQuestion,
  answerPastorQuestion,
} from '../controllers/pastor/pastor.controller';

const pastorPreHandler: preHandlerAsyncHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  await authenticate(request, reply);
};

export function registerPastorRoutes(app: FastifyInstance): void {
  /* eslint-disable @typescript-eslint/no-misused-promises -- Fastify preHandler + handler */
  app.get('/me', { preHandler: pastorPreHandler }, catchAsync(getPastorMe));
  app.post('/me/deactivate', { preHandler: pastorPreHandler }, catchAsync(deactivatePastorMe));
  app.post('/me/reactivate', { preHandler: pastorPreHandler }, catchAsync(reactivatePastorMe));
  app.post<{ Body: { message?: string } }>(
    '/me/appeals',
    { preHandler: pastorPreHandler },
    catchAsync(submitPastorAppeal)
  );

  app.post<{
    Body: {
      name: string;
      title?: string;
      church?: string;
      bio?: string;
      image?: string;
      expertise?: string[];
      motivation?: string;
    };
  }>('/application', { preHandler: pastorPreHandler }, catchAsync(submitPastorApplication));

  app.get('/me/profile', { preHandler: pastorPreHandler }, catchAsync(getPastorProfile));

  app.patch<{
    Body: {
      name?: string;
      title?: string;
      church?: string;
      bio?: string;
      image?: string;
      expertise?: string[];
    };
  }>('/me/profile', { preHandler: pastorPreHandler }, catchAsync(updatePastorProfile));

  app.get(
    '/dashboard-stats',
    { preHandler: pastorPreHandler },
    catchAsync(getPastorDashboardStats)
  );

  app.get<{
    Querystring: { page?: string; limit?: string; status?: string; search?: string; sort?: string };
  }>('/questions', { preHandler: pastorPreHandler }, catchAsync(listPastorQuestions));

  app.get<{ Params: { id: string } }>(
    '/questions/:id',
    { preHandler: pastorPreHandler },
    catchAsync(getPastorQuestion)
  );

  app.post<{ Params: { id: string }; Body: { answer: string } }>(
    '/questions/:id/answers',
    { preHandler: pastorPreHandler },
    catchAsync(answerPastorQuestion)
  );
  /* eslint-enable @typescript-eslint/no-misused-promises */
}
