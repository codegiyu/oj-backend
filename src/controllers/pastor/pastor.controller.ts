import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { getAuthUser } from '../../utils/getAuthUser';
import { sendResponse } from '../../utils/response';
import * as pastorPortalService from '../../services/pastorPortal.service';

function requireClientAccess(request: FastifyRequest): string {
  const auth = getAuthUser(request);

  if (!auth || auth.scope !== 'client-access') {
    throw new AppError('Unauthorized', 401);
  }

  return auth.userId;
}

/** Re-export for callers that resolve pastor by user id (e.g. unit tests, other modules). */
export { getPastorForUser } from '../../services/pastorPortal.service';

/** GET /pastor/me — portal state: active pastor profile, pending/rejected application, or none. */
export async function getPastorMe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const data = await pastorPortalService.loadPastorMe(requireClientAccess(request));

  sendResponse(reply, 200, data, 'Pastor portal loaded.');
}

export async function deactivatePastorMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await pastorPortalService.deactivatePastorProfile(requireClientAccess(request));

  sendResponse(reply, 200, { success: true }, 'Pastor profile deactivated.');
}

export async function reactivatePastorMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await pastorPortalService.reactivatePastorProfile(requireClientAccess(request));

  sendResponse(reply, 200, { success: true }, 'Pastor profile reactivated.');
}

export async function submitPastorAppeal(
  request: FastifyRequest<{ Body: { message?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const data = await pastorPortalService.submitPastorProfileAppeal(
    requireClientAccess(request),
    request.body?.message ?? ''
  );

  sendResponse(reply, 201, data, 'Appeal submitted.');
}

/** POST /pastor/application — submit pastor application for admin review. */
export async function submitPastorApplication(
  request: FastifyRequest<{
    Body: {
      name: string;
      title?: string;
      church?: string;
      bio?: string;
      image?: string;
      expertise?: string[];
      motivation?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await pastorPortalService.submitPastorApplication(
    requireClientAccess(request),
    request.body ?? { name: '' }
  );

  sendResponse(reply, result.statusCode, result.data, result.message);
}

/** GET /pastor/me/profile */
export async function getPastorProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const data = await pastorPortalService.loadPastorProfile(requireClientAccess(request));

  sendResponse(reply, 200, data, 'Pastor profile loaded.');
}

/** PATCH /pastor/me/profile */
export async function updatePastorProfile(
  request: FastifyRequest<{
    Body: {
      name?: string;
      title?: string;
      church?: string;
      bio?: string;
      image?: string;
      expertise?: string[];
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await pastorPortalService.updatePastorProfile(
    requireClientAccess(request),
    request.body ?? {}
  );

  sendResponse(reply, 200, data, 'Pastor profile updated.');
}

/** GET /pastor/dashboard-stats */
export async function getPastorDashboardStats(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const stats = await pastorPortalService.loadPastorDashboardStats(requireClientAccess(request));

  sendResponse(reply, 200, stats, 'Pastor dashboard stats loaded.');
}

/** GET /pastor/questions */
export async function listPastorQuestions(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; status?: string; search?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await pastorPortalService.listPastorQuestions(
    requireClientAccess(request),
    request.query ?? {}
  );

  sendResponse(reply, 200, data, 'Pastor questions list loaded.');
}

/** GET /pastor/questions/:id */
export async function getPastorQuestion(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const data = await pastorPortalService.loadPastorQuestion(
    requireClientAccess(request),
    request.params.id
  );

  sendResponse(reply, 200, data, 'Question loaded.');
}

/** POST /pastor/questions/:id/answers */
export async function answerPastorQuestion(
  request: FastifyRequest<{ Params: { id: string }; Body: { answer: string } }>,
  reply: FastifyReply
): Promise<void> {
  const data = await pastorPortalService.answerPastorQuestion(
    requireClientAccess(request),
    request.params.id,
    request.body?.answer ?? ''
  );

  sendResponse(reply, 201, data, 'Answer submitted.');
}
