import { FastifyInstance } from 'fastify';
import { catchAsync } from '../utils/catchAsync';
import {
  listPublicMusic,
  getPublicMusicByIdOrSlug,
  listPublicVideos,
  getPublicVideoByIdOrSlug,
  listPublicNews,
  getPublicNewsByIdOrSlug,
} from '../controllers/public/public.controller';
import {
  listPublicMusicQuerystringSchema,
  listPublicVideosQuerystringSchema,
  listPublicNewsQuerystringSchema,
  idOrSlugParamSchema,
} from '../controllers/public/public.validation';

export async function registerPublicRoutes(app: FastifyInstance): Promise<void> {
  // Music
  app.get<{
    Querystring: {
      category?: string;
      page?: string;
      limit?: string;
      status?: string;
      type?: string;
      period?: string;
    };
  }>('/music', { schema: listPublicMusicQuerystringSchema }, catchAsync(listPublicMusic));

  app.get<{ Params: { idOrSlug: string } }>(
    '/music/:idOrSlug',
    { schema: idOrSlugParamSchema },
    catchAsync(getPublicMusicByIdOrSlug)
  );

  // Videos
  app.get<{
    Querystring: {
      category?: string;
      page?: string;
      limit?: string;
      status?: string;
      type?: string;
    };
  }>('/videos', { schema: listPublicVideosQuerystringSchema }, catchAsync(listPublicVideos));

  app.get<{ Params: { idOrSlug: string } }>(
    '/videos/:idOrSlug',
    { schema: idOrSlugParamSchema },
    catchAsync(getPublicVideoByIdOrSlug)
  );

  // News
  app.get<{
    Querystring: {
      category?: string;
      page?: string;
      limit?: string;
      status?: string;
      type?: string;
    };
  }>('/news', { schema: listPublicNewsQuerystringSchema }, catchAsync(listPublicNews));

  app.get<{ Params: { idOrSlug: string } }>(
    '/news/:idOrSlug',
    { schema: idOrSlugParamSchema },
    catchAsync(getPublicNewsByIdOrSlug)
  );
}
