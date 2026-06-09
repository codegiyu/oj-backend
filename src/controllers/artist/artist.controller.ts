import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { getAuthUser } from '../../utils/getAuthUser';
import { sendResponse } from '../../utils/response';
import * as artistService from '../../services/artist.service';

function requireClientAccess(request: FastifyRequest): string {
  const auth = getAuthUser(request);

  if (!auth || auth.scope !== 'client-access') {
    throw new AppError('Unauthorized', 401);
  }

  return auth.userId;
}

/** Artist self-serve uploads are disabled; submissions go through WhatsApp / admin. */
export function rejectArtistMediaWrite(
  _request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  return Promise.reject(
    new AppError(
      'Content submissions are handled via WhatsApp. Contact the admin to publish your work.',
      403
    )
  );
}

export async function getArtistMe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const data = await artistService.loadArtistMe(requireClientAccess(request));

  sendResponse(reply, 200, data, 'Artist profile loaded.');
}

export async function deactivateArtistMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await artistService.deactivateArtistProfile(requireClientAccess(request));

  sendResponse(reply, 200, { success: true }, 'Artist profile deactivated.');
}

export async function reactivateArtistMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await artistService.reactivateArtistProfile(requireClientAccess(request));

  sendResponse(reply, 200, { success: true }, 'Artist profile reactivated.');
}

export async function submitArtistAppeal(
  request: FastifyRequest<{ Body: { message?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const data = await artistService.submitArtistProfileAppeal(
    requireClientAccess(request),
    request.body?.message ?? ''
  );

  sendResponse(reply, 201, data, 'Appeal submitted.');
}

export async function createArtistMe(
  request: FastifyRequest<{
    Body: {
      name: string;
      bio?: string;
      image?: string;
      coverImage?: string;
      genre?: string;
      socials?: Record<string, string>;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await artistService.createArtistProfile(
    requireClientAccess(request),
    request.body ?? { name: '' }
  );

  sendResponse(reply, result.statusCode, result.data, result.message);
}

export async function updateArtistMe(
  request: FastifyRequest<{
    Body: {
      name?: string;
      bio?: string;
      image?: string;
      coverImage?: string;
      genre?: string;
      socials?: Record<string, string>;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await artistService.updateArtistProfile(
    requireClientAccess(request),
    request.body ?? {}
  );

  sendResponse(reply, 200, data, 'Artist profile loaded.');
}

export async function getDashboardStats(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const data = await artistService.loadArtistDashboardStats(requireClientAccess(request));

  sendResponse(reply, 200, data, 'Artist dashboard stats loaded.');
}

export async function getRecentUploads(
  request: FastifyRequest<{ Querystring?: { limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const data = await artistService.loadArtistRecentUploads(
    requireClientAccess(request),
    request.query?.limit
  );

  sendResponse(reply, 200, data, 'Recent uploads loaded.');
}

export async function listMyMusic(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; status?: string; search?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await artistService.listArtistMusic(requireClientAccess(request), request.query);

  sendResponse(reply, 200, data, 'Artist music list loaded.');
}

export async function getMusicItem(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const data = await artistService.loadArtistMusicItem(
    requireClientAccess(request),
    request.params.id
  );

  sendResponse(reply, 200, data, 'Music loaded.');
}

export async function createMusic(
  request: FastifyRequest<{
    Body: {
      title: string;
      description?: string;
      lyrics?: string;
      coverImage?: string;
      audioUrl?: string;
      videoUrl?: string;
      category?: string;
      isMonetizable?: boolean;
      price?: number;
      metadata?: Record<string, unknown>;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await artistService.createArtistMusic(requireClientAccess(request), request.body);

  sendResponse(reply, 201, data, 'Music created.');
}

export async function updateMusic(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      title?: string;
      description?: string;
      lyrics?: string;
      coverImage?: string;
      audioUrl?: string;
      videoUrl?: string;
      category?: string;
      status?: string;
      isMonetizable?: boolean;
      price?: number;
      metadata?: Record<string, unknown>;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await artistService.updateArtistMusic(
    requireClientAccess(request),
    request.params.id,
    request.body ?? {}
  );

  sendResponse(reply, 200, data, 'Music updated.');
}

export async function deleteMusic(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  await artistService.archiveArtistMusic(requireClientAccess(request), request.params.id);

  sendResponse(reply, 200, { success: true }, 'Music deleted.');
}

export async function listMyVideos(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; status?: string; search?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await artistService.listArtistVideos(requireClientAccess(request), request.query);

  sendResponse(reply, 200, data, 'Artist videos list loaded.');
}

export async function getVideoItem(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const data = await artistService.loadArtistVideoItem(
    requireClientAccess(request),
    request.params.id
  );

  sendResponse(reply, 200, data, 'Video loaded.');
}

export async function createVideo(
  request: FastifyRequest<{
    Body: {
      title: string;
      description?: string;
      thumbnail?: string;
      videoUrl?: string;
      videoFileUrl?: string;
      embedUrl?: string;
      category?: string;
      isMonetizable?: boolean;
      price?: number;
      metadata?: Record<string, unknown>;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await artistService.createArtistVideo(requireClientAccess(request), request.body);

  sendResponse(reply, 201, data, 'Video created.');
}

export async function updateVideo(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      title?: string;
      description?: string;
      thumbnail?: string;
      videoUrl?: string;
      videoFileUrl?: string;
      embedUrl?: string;
      category?: string;
      status?: string;
      isMonetizable?: boolean;
      price?: number;
      metadata?: Record<string, unknown>;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await artistService.updateArtistVideo(
    requireClientAccess(request),
    request.params.id,
    request.body ?? {}
  );

  sendResponse(reply, 200, data, 'Video updated.');
}

export async function deleteVideo(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  await artistService.archiveArtistVideo(requireClientAccess(request), request.params.id);

  sendResponse(reply, 200, { success: true }, 'Video deleted.');
}
