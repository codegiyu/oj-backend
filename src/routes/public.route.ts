import { FastifyInstance } from 'fastify';
import { catchAsync } from '../utils/catchAsync';
import { authenticatePreHandler } from '../middleware/auth.middleware';
import {
  listPublicMusic,
  getPublicMusicByIdOrSlug,
  listPublicAlbums,
  getPublicAlbumByIdOrSlug,
  downloadPublicMusic,
  listPublicVideos,
  getPublicVideoByIdOrSlug,
  downloadPublicVideo,
  listPublicNews,
  getPublicNewsByIdOrSlug,
  listPublicContentCategories,
  listPublicHomeAdverts,
} from '../controllers/public/public.controller';
import { postPublicContentAnalyticsEvent } from '../controllers/public/contentAnalytics.controller';
import {
  getCommunity,
  getCommunityHighlights,
  getAskAPastorHub,
  getPrayerRequestsHub,
  listDevotionals,
  getDevotionalByIdOrSlug,
  listTestimonies,
  getTestimonyByIdOrSlug,
  listPrayerRequests,
  getPrayerRequestByIdOrSlug,
  listAskAPastorQuestions,
  getAskAPastorQuestionByIdOrSlug,
  listAskAPastorPastors,
  getAskAPastorPastorByIdOrSlug,
  listPolls,
  getPollByIdOrSlug,
  listCommunityArtists,
  getCommunityArtistByIdOrSlug,
  listResources,
  submitPrayerRequest,
  submitQuestion,
  submitTestimony,
  createPoll,
  votePoll,
  postPrayerForRequest,
  voteAskPastorQuestion,
  likeAskPastorAnswer,
} from '../controllers/public/community.controller';
import { submitContact } from '../controllers/public/contact.controller';
import { search } from '../controllers/public/search.controller';
import { submitContactBodySchema } from '../controllers/public/contact.validation';
import { searchQuerystringSchema } from '../controllers/public/search.validation';
import {
  listPublicMusicQuerystringSchema,
  listPublicAlbumsQuerystringSchema,
  listPublicVideosQuerystringSchema,
  listPublicNewsQuerystringSchema,
  idOrSlugParamSchema,
  listPublicContentCategoriesQuerystringSchema,
  listPublicHomeAdvertsQuerystringSchema,
  contentAnalyticsEventBodySchema,
} from '../controllers/public/public.validation';
import {
  listFeaturedOptions,
  listPromotionPricingOptions,
  listResourceDownloadCategories,
  getPromotionContact,
} from '../controllers/public/promotion.controller';
import { promotionPublicListQuerystringSchema } from '../controllers/public/promotion.validation';
import {
  listDevotionalsQuerystringSchema,
  listTestimoniesQuerystringSchema,
  listPrayerRequestsQuerystringSchema,
  listAskAPastorQuestionsQuerystringSchema,
  listPollsQuerystringSchema,
  listArtistsQuerystringSchema,
  listPastorsQuerystringSchema,
  listResourcesQuerystringSchema,
  communityIdOrSlugParamSchema,
  submitPrayerRequestBodySchema,
  submitQuestionBodySchema,
  submitTestimonyBodySchema,
  createPollBodySchema,
  votePollBodySchema,
  voteQuestionBodySchema,
  likeAnswerParamsSchema,
} from '../controllers/public/community.validation';

// eslint-disable-next-line @typescript-eslint/require-await
export async function registerPublicRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: Record<string, unknown> }>(
    '/analytics/content-event',
    {
      schema: contentAnalyticsEventBodySchema,
      config: {
        rateLimit: {
          max: 120,
          timeWindow: '1 minute',
        },
      },
    },
    catchAsync(postPublicContentAnalyticsEvent)
  );

  app.get(
    '/featured-options',
    { schema: promotionPublicListQuerystringSchema },
    catchAsync(listFeaturedOptions)
  );
  app.get(
    '/promotion-pricing-options',
    { schema: promotionPublicListQuerystringSchema },
    catchAsync(listPromotionPricingOptions)
  );
  app.get(
    '/resource-download-categories',
    { schema: promotionPublicListQuerystringSchema },
    catchAsync(listResourceDownloadCategories)
  );
  app.get(
    '/promotion-contact',
    { schema: promotionPublicListQuerystringSchema },
    catchAsync(getPromotionContact)
  );

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
    '/music/:idOrSlug/download',
    { schema: idOrSlugParamSchema },
    catchAsync(downloadPublicMusic)
  );

  app.get<{ Params: { idOrSlug: string } }>(
    '/music/:idOrSlug',
    { schema: idOrSlugParamSchema },
    catchAsync(getPublicMusicByIdOrSlug)
  );

  // Albums
  app.get<{
    Querystring: {
      artist?: string;
      page?: string;
      limit?: string;
      type?: string;
    };
  }>('/albums', { schema: listPublicAlbumsQuerystringSchema }, catchAsync(listPublicAlbums));

  app.get<{ Params: { idOrSlug: string } }>(
    '/albums/:idOrSlug',
    { schema: idOrSlugParamSchema },
    catchAsync(getPublicAlbumByIdOrSlug)
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
    '/videos/:idOrSlug/download',
    { schema: idOrSlugParamSchema },
    catchAsync(downloadPublicVideo)
  );

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

  app.get<{ Querystring: { scope?: string } }>(
    '/content-categories',
    { schema: listPublicContentCategoriesQuerystringSchema },
    catchAsync(listPublicContentCategories)
  );

  app.get(
    '/home-adverts',
    { schema: listPublicHomeAdvertsQuerystringSchema },
    catchAsync(listPublicHomeAdverts)
  );

  // Community
  app.get('/community', catchAsync(getCommunity));
  app.get('/community/highlights', catchAsync(getCommunityHighlights));
  app.get('/ask-a-pastor/hub', catchAsync(getAskAPastorHub));
  app.get('/prayer-requests/hub', catchAsync(getPrayerRequestsHub));

  app.get(
    '/devotionals',
    { schema: listDevotionalsQuerystringSchema },
    catchAsync(listDevotionals)
  );
  app.get<{ Params: { idOrSlug: string } }>(
    '/devotionals/:idOrSlug',
    { schema: communityIdOrSlugParamSchema },
    catchAsync(getDevotionalByIdOrSlug)
  );

  app.get(
    '/testimonies',
    { schema: listTestimoniesQuerystringSchema },
    catchAsync(listTestimonies)
  );
  app.get<{ Params: { idOrSlug: string } }>(
    '/testimonies/:idOrSlug',
    { schema: communityIdOrSlugParamSchema },
    catchAsync(getTestimonyByIdOrSlug)
  );

  app.get(
    '/prayer-requests',
    { schema: listPrayerRequestsQuerystringSchema },
    catchAsync(listPrayerRequests)
  );
  app.get<{ Params: { idOrSlug: string } }>(
    '/prayer-requests/:idOrSlug',
    { schema: communityIdOrSlugParamSchema },
    catchAsync(getPrayerRequestByIdOrSlug)
  );
  app.post<{ Params: { idOrSlug: string } }>(
    '/prayer-requests/:idOrSlug/pray',
    { schema: communityIdOrSlugParamSchema },
    catchAsync(postPrayerForRequest)
  );

  app.get<{ Querystring: { status?: string; category?: string; page?: string; limit?: string } }>(
    '/ask-a-pastor/questions',
    { schema: listAskAPastorQuestionsQuerystringSchema },
    catchAsync(listAskAPastorQuestions)
  );
  app.get<{ Params: { idOrSlug: string } }>(
    '/ask-a-pastor/questions/:idOrSlug',
    { schema: communityIdOrSlugParamSchema },
    catchAsync(getAskAPastorQuestionByIdOrSlug)
  );
  app.get(
    '/ask-a-pastor/pastors',
    { schema: listPastorsQuerystringSchema },
    catchAsync(listAskAPastorPastors)
  );
  app.get<{ Params: { idOrSlug: string } }>(
    '/ask-a-pastor/pastors/:idOrSlug',
    { schema: communityIdOrSlugParamSchema },
    catchAsync(getAskAPastorPastorByIdOrSlug)
  );

  app.get<{ Querystring: { status?: string; page?: string; limit?: string } }>(
    '/polls',
    { schema: listPollsQuerystringSchema },
    catchAsync(listPolls)
  );
  app.get<{ Params: { idOrSlug: string } }>(
    '/polls/:idOrSlug',
    { schema: communityIdOrSlugParamSchema },
    catchAsync(getPollByIdOrSlug)
  );
  app.post<{ Body: { optionId: string }; Params: { idOrSlug: string } }>(
    '/polls/:idOrSlug/vote',
    { preHandler: [authenticatePreHandler], schema: votePollBodySchema },
    catchAsync(votePoll)
  );
  app.post<{
    Body: { question: string; description?: string; category?: string; options: string[] };
  }>(
    '/polls',
    { preHandler: [authenticatePreHandler], schema: createPollBodySchema },
    catchAsync(createPoll)
  );

  app.get('/artists', { schema: listArtistsQuerystringSchema }, catchAsync(listCommunityArtists));
  app.get<{ Params: { idOrSlug: string } }>(
    '/artists/:idOrSlug',
    { schema: communityIdOrSlugParamSchema },
    catchAsync(getCommunityArtistByIdOrSlug)
  );

  app.get('/resources', { schema: listResourcesQuerystringSchema }, catchAsync(listResources));

  app.post<{
    Body: { name: string; phone: string; email?: string; subject: string; message: string };
  }>('/contact', { schema: submitContactBodySchema }, catchAsync(submitContact));

  app.get<{ Querystring: { q?: string; type?: string; page?: string; limit?: string } }>(
    '/search',
    { schema: searchQuerystringSchema },
    catchAsync(search)
  );

  app.post<{
    Body: {
      name?: string;
      email?: string;
      title: string;
      content: string;
      category?: string;
      urgent?: boolean;
    };
  }>(
    '/prayer-requests',
    { schema: submitPrayerRequestBodySchema },
    catchAsync(submitPrayerRequest)
  );
  app.post<{ Body: { name?: string; email?: string; question: string; category?: string } }>(
    '/ask-a-pastor/questions',
    { schema: submitQuestionBodySchema },
    catchAsync(submitQuestion)
  );
  app.post<{ Body: { direction: 'up' | 'down' }; Params: { idOrSlug: string } }>(
    '/ask-a-pastor/questions/:idOrSlug/vote',
    { preHandler: [authenticatePreHandler], schema: voteQuestionBodySchema },
    catchAsync(voteAskPastorQuestion)
  );
  app.post<{ Params: { idOrSlug: string; answerId: string } }>(
    '/ask-a-pastor/questions/:idOrSlug/answers/:answerId/like',
    { preHandler: [authenticatePreHandler], schema: likeAnswerParamsSchema },
    catchAsync(likeAskPastorAnswer)
  );
  app.post<{ Body: { name?: string; category?: string; content: string } }>(
    '/testimonies',
    { schema: submitTestimonyBodySchema },
    catchAsync(submitTestimony)
  );
}
