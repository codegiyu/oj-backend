import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import {
  getArtistMe,
  updateArtistMe,
  getDashboardStats,
  listMyMusic,
  getMusicItem,
  createMusic,
  updateMusic,
  deleteMusic,
  listMyVideos,
  getVideoItem,
  createVideo,
  updateVideo,
  deleteVideo,
} from '../controllers/artist/artist.controller';
import {
  updateArtistMeBodySchema,
  listMusicQuerystringSchema,
  listVideosQuerystringSchema,
  resourceIdParamSchema,
  createMusicBodySchema,
  updateMusicSchema,
  createVideoBodySchema,
  updateVideoSchema,
} from '../controllers/artist/artist.validation';

export async function registerArtistRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', { preHandler: authenticate }, catchAsync(getArtistMe));

  app.patch<{
    Body: {
      name?: string;
      bio?: string;
      image?: string;
      coverImage?: string;
      genre?: string;
      socials?: Record<string, string>;
    };
  }>('/me', { preHandler: authenticate, schema: updateArtistMeBodySchema }, catchAsync(updateArtistMe));

  app.get('/dashboard-stats', { preHandler: authenticate }, catchAsync(getDashboardStats));

  app.get<{
    Querystring: { page?: string; limit?: string; status?: string; search?: string; sort?: string };
  }>('/music', { preHandler: authenticate, schema: listMusicQuerystringSchema }, catchAsync(listMyMusic));

  app.get<{ Params: { id: string } }>(
    '/music/:id',
    { preHandler: authenticate, schema: resourceIdParamSchema },
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
  }>('/music', { preHandler: authenticate, schema: createMusicBodySchema }, catchAsync(createMusic));

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
  }>('/music/:id', { preHandler: authenticate, schema: updateMusicSchema }, catchAsync(updateMusic));

  app.delete<{ Params: { id: string } }>(
    '/music/:id',
    { preHandler: authenticate, schema: resourceIdParamSchema },
    catchAsync(deleteMusic)
  );

  app.get<{
    Querystring: { page?: string; limit?: string; status?: string; search?: string; sort?: string };
  }>('/videos', { preHandler: authenticate, schema: listVideosQuerystringSchema }, catchAsync(listMyVideos));

  app.get<{ Params: { id: string } }>(
    '/videos/:id',
    { preHandler: authenticate, schema: resourceIdParamSchema },
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
  }>('/videos', { preHandler: authenticate, schema: createVideoBodySchema }, catchAsync(createVideo));

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
  }>('/videos/:id', { preHandler: authenticate, schema: updateVideoSchema }, catchAsync(updateVideo));

  app.delete<{ Params: { id: string } }>(
    '/videos/:id',
    { preHandler: authenticate, schema: resourceIdParamSchema },
    catchAsync(deleteVideo)
  );
}

