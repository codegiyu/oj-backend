import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import {
  getArtistMe,
  createArtistMe,
  updateArtistMe,
  getDashboardStats,
  listMyMusic,
  getMusicItem,
  rejectArtistMediaWrite,
  listMyVideos,
  getVideoItem,
} from '../controllers/artist/artist.controller';
import {
  createArtistMeBodySchema,
  updateArtistMeBodySchema,
  listMusicQuerystringSchema,
  listVideosQuerystringSchema,
  resourceIdParamSchema,
  createMusicBodySchema,
  updateMusicSchema,
  createVideoBodySchema,
  updateVideoSchema,
} from '../controllers/artist/artist.validation';

/** Wrapper so generic route options get a hook typed as `preHandlerAsyncHookHandler`. */
const artistPreHandler: preHandlerAsyncHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  await authenticate(request, reply);
};

export function registerArtistRoutes(app: FastifyInstance): void {
  /* Generic route overloads type `preHandler` as sync-only; async hooks are valid at runtime. */
  /* eslint-disable @typescript-eslint/no-misused-promises -- Fastify preHandler + handler */
  app.get('/me', { preHandler: artistPreHandler }, catchAsync(getArtistMe));

  app.post<{
    Body: {
      name: string;
      bio?: string;
      image?: string;
      coverImage?: string;
      genre?: string;
      socials?: Record<string, string>;
    };
  }>(
    '/me',
    { preHandler: artistPreHandler, schema: createArtistMeBodySchema },
    catchAsync(createArtistMe)
  );

  app.patch<{
    Body: {
      name?: string;
      bio?: string;
      image?: string;
      coverImage?: string;
      genre?: string;
      socials?: Record<string, string>;
    };
  }>(
    '/me',
    { preHandler: artistPreHandler, schema: updateArtistMeBodySchema },
    catchAsync(updateArtistMe)
  );

  app.get('/dashboard-stats', { preHandler: artistPreHandler }, catchAsync(getDashboardStats));

  app.get<{
    Querystring: { page?: string; limit?: string; status?: string; search?: string; sort?: string };
  }>(
    '/music',
    { preHandler: artistPreHandler, schema: listMusicQuerystringSchema },
    catchAsync(listMyMusic)
  );

  app.get<{ Params: { id: string } }>(
    '/music/:id',
    { preHandler: artistPreHandler, schema: resourceIdParamSchema },
    catchAsync(getMusicItem)
  );

  app.post<{
    Body: {
      title: string;
      description?: string;
      lyrics?: string;
      coverImage?: string;
      audioUrl?: string;
      videoUrl?: string;
      category?: string;
      isMonetizable?: boolean;
    };
  }>(
    '/music',
    { preHandler: artistPreHandler, schema: createMusicBodySchema },
    catchAsync(rejectArtistMediaWrite)
  );

  app.patch<{
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
    };
  }>(
    '/music/:id',
    { preHandler: artistPreHandler, schema: updateMusicSchema },
    catchAsync(rejectArtistMediaWrite)
  );

  app.delete<{ Params: { id: string } }>(
    '/music/:id',
    { preHandler: artistPreHandler, schema: resourceIdParamSchema },
    catchAsync(rejectArtistMediaWrite)
  );

  app.get<{
    Querystring: { page?: string; limit?: string; status?: string; search?: string; sort?: string };
  }>(
    '/videos',
    { preHandler: artistPreHandler, schema: listVideosQuerystringSchema },
    catchAsync(listMyVideos)
  );

  app.get<{ Params: { id: string } }>(
    '/videos/:id',
    { preHandler: artistPreHandler, schema: resourceIdParamSchema },
    catchAsync(getVideoItem)
  );

  app.post<{
    Body: {
      title: string;
      description?: string;
      thumbnail?: string;
      videoUrl?: string;
      category?: string;
      isMonetizable?: boolean;
    };
  }>(
    '/videos',
    { preHandler: artistPreHandler, schema: createVideoBodySchema },
    catchAsync(rejectArtistMediaWrite)
  );

  app.patch<{
    Params: { id: string };
    Body: {
      title?: string;
      description?: string;
      thumbnail?: string;
      videoUrl?: string;
      category?: string;
      status?: string;
      isMonetizable?: boolean;
    };
  }>(
    '/videos/:id',
    { preHandler: artistPreHandler, schema: updateVideoSchema },
    catchAsync(rejectArtistMediaWrite)
  );

  app.delete<{ Params: { id: string } }>(
    '/videos/:id',
    { preHandler: artistPreHandler, schema: resourceIdParamSchema },
    catchAsync(rejectArtistMediaWrite)
  );
  /* eslint-enable @typescript-eslint/no-misused-promises */
}
