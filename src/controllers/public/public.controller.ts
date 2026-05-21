import { FastifyRequest, FastifyReply } from 'fastify';
import { sendResponse } from '../../utils/response';
import {
  listPublicContentCategoriesForApi,
  listPublicHomeAdvertsForApi,
} from '../../services/publicCatalog.service';
import * as publicMediaService from '../../services/publicMedia.service';

async function respond(
  reply: FastifyReply,
  result: publicMediaService.PublicMediaServiceResult
): Promise<void> {
  if (result.redirectUrl) {
    reply.code(result.statusCode);
    await reply.redirect(result.redirectUrl);

    return;
  }

  sendResponse(
    reply,
    result.statusCode,
    (result.data ?? null) as Record<string, unknown> | null,
    result.message
  );
}

export async function listPublicMusic(
  request: FastifyRequest<{
    Querystring: {
      category?: string;
      excludeCategory?: string;
      artist?: string;
      page?: string;
      limit?: string;
      status?: string;
      type?: string;
      period?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await publicMediaService.listPublicMusic(request));
}

export async function getPublicMusicByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await publicMediaService.getPublicMusicByIdOrSlug(request));
}

export async function listPublicVideos(
  request: FastifyRequest<{
    Querystring: {
      category?: string;
      artist?: string;
      page?: string;
      limit?: string;
      status?: string;
      type?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await publicMediaService.listPublicVideos(request));
}

export async function getPublicVideoByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await publicMediaService.getPublicVideoByIdOrSlug(request));
}

export async function listPublicNews(
  request: FastifyRequest<{
    Querystring: {
      category?: string;
      page?: string;
      limit?: string;
      status?: string;
      type?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await publicMediaService.listPublicNews(request));
}

export async function getPublicNewsByIdOrSlug(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await publicMediaService.getPublicNewsByIdOrSlug(request));
}

export async function downloadPublicMusic(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await publicMediaService.downloadPublicMusic(request));
}

export async function downloadPublicVideo(
  request: FastifyRequest<{ Params: { idOrSlug: string } }>,
  reply: FastifyReply
): Promise<void> {
  await respond(reply, await publicMediaService.downloadPublicVideo(request));
}

export async function listPublicContentCategories(
  request: FastifyRequest<{ Querystring: { scope?: string; page?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { categories } = await listPublicContentCategoriesForApi(request.query);

  sendResponse(reply, 200, { categories }, 'Content categories loaded.');
}

export async function listPublicHomeAdverts(
  request: FastifyRequest<{ Querystring?: { limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { adverts } = await listPublicHomeAdvertsForApi(request.query ?? {});

  sendResponse(reply, 200, { adverts }, 'Home adverts loaded.');
}
