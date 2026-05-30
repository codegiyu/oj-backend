/**
 * Community public API controller — HTTP wiring only; logic in community.service.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { sendResponse } from '../../utils/response';
import type { AsyncRouteHandler } from '../../utils/catchAsync';
import * as communityService from '../../services/community.service';

// eslint-disable-next-line @typescript-eslint/require-await
async function respond(
  reply: FastifyReply,
  result: { statusCode: number; data: unknown; message: string }
): Promise<void> {
  sendResponse(
    reply,
    result.statusCode,
    result.data as Record<string, unknown> | null,
    result.message
  );
}

export async function getCommunity(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await respond(reply, await communityService.getCommunity());
}

export async function listDevotionals(
  request: FastifyRequest<{
    Querystring: {
      type?: string;
      category?: string;
      page?: string;
      limit?: string;
      status?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.listDevotionals(request));
}

export async function getDevotionalByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.getDevotionalByIdOrSlug(request));
}

export async function listTestimonies(
  request: FastifyRequest<{
    Querystring: {
      type?: string;
      category?: string;
      page?: string;
      limit?: string;
      status?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.listTestimonies(request));
}

export async function getTestimonyByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.getTestimonyByIdOrSlug(request));
}

export async function listPrayerRequests(
  request: FastifyRequest<{
    Querystring: { status?: string; category?: string; page?: string; limit?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.listPrayerRequests(request));
}

export async function getPrayerRequestByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.getPrayerRequestByIdOrSlug(request));
}

export async function listAskAPastorQuestions(
  request: FastifyRequest<{
    Querystring: { status?: string; category?: string; page?: string; limit?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.listAskAPastorQuestions(request));
}

export async function getAskAPastorQuestionByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.getAskAPastorQuestionByIdOrSlug(request));
}

export async function listAskAPastorPastors(
  request: FastifyRequest<{ Querystring?: { page?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.listAskAPastorPastors(request));
}

export async function listPolls(
  request: FastifyRequest<{
    Querystring: { status?: string; page?: string; limit?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.listPolls(request));
}

export async function getPollByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.getPollByIdOrSlug(request));
}

export async function listCommunityArtists(
  request: FastifyRequest<{ Querystring?: { page?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.listCommunityArtists(request));
}

export async function getCommunityArtistByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.getCommunityArtistByIdOrSlug(request));
}

export async function listResources(
  request: FastifyRequest<{
    Querystring: { type?: string; page?: string; limit?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.listResources(request));
}

export async function submitPrayerRequest(
  request: FastifyRequest<{
    Body: {
      name?: string;
      email?: string;
      title: string;
      content: string;
      category?: string;
      urgent?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.submitPrayerRequest(request));
}

export async function submitQuestion(
  request: FastifyRequest<{
    Body: { name?: string; email?: string; question: string; category?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.submitQuestion(request));
}

export async function submitTestimony(
  request: FastifyRequest<{
    Body: { name?: string; category?: string; content: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.submitTestimony(request));
}

export async function createPoll(
  request: FastifyRequest<{
    Body: { question: string; description?: string; category?: string; options: string[] };
  }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.createPoll(request));
}

export async function votePoll(
  request: FastifyRequest<{
    Params: { idOrSlug: string };
    Body: { optionId: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await communityService.votePoll(request));
}

export const postPrayerForRequest: AsyncRouteHandler<
  FastifyRequest<{ Params: { idOrSlug: string } }>
> = async (request, reply) => {
  await respond(reply, await communityService.recordPrayerForRequest(request));
};
