/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-misused-promises -- Fastify route registration and async preHandler hooks */
import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import {
  getMe,
  getUserDashboard,
  updateMe,
  listWishlist,
  addToWishlist,
  removeFromWishlist,
  getCart,
  addToCart,
  updateCart,
  removeFromCart,
  clearCart,
} from '../controllers/user/user.controller';
import {
  listFavorites,
  addFavorite,
  removeFavorite,
} from '../controllers/user/contentFavorite.controller';
import {
  listMyCommunityQuestions,
  getMyCommunityQuestion,
  closeMyCommunityQuestion,
  listMyCommunityTestimonies,
  listMyCommunityPrayerRequests,
  listMyCommunityPolls,
  closeMyCommunityPoll,
} from '../controllers/user/userCommunity.controller';
import {
  updateMeBodySchema,
  addToWishlistBodySchema,
  listWishlistQuerystringSchema,
  wishlistProductIdParamSchema,
  listFavoritesQuerystringSchema,
  addFavoriteBodySchema,
  favoriteEntityParamsSchema,
  cartBodySchema,
  updateCartBodySchema,
  cartProductIdParamSchema,
} from '../controllers/user/user.validation';

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', { preHandler: authenticate }, catchAsync(getMe));
  app.get('/dashboard', { preHandler: authenticate }, catchAsync(getUserDashboard));
  app.patch<{
    Body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phoneNumber?: string;
      avatar?: string;
    };
  }>('/me', { preHandler: authenticate, schema: updateMeBodySchema }, catchAsync(updateMe));
  app.get<{ Querystring: { page?: string; limit?: string; search?: string; sort?: string } }>(
    '/wishlist',
    { preHandler: authenticate, schema: listWishlistQuerystringSchema },
    catchAsync(listWishlist)
  );
  app.post<{ Body: { productId: string } }>(
    '/wishlist',
    { preHandler: authenticate, schema: addToWishlistBodySchema },
    catchAsync(addToWishlist)
  );
  app.delete<{ Params: { productId: string } }>(
    '/wishlist/:productId',
    { preHandler: authenticate, schema: wishlistProductIdParamSchema },
    catchAsync(removeFromWishlist)
  );

  app.get<{ Querystring: { page?: string; limit?: string; entityType?: string } }>(
    '/favorites',
    { preHandler: authenticate, schema: listFavoritesQuerystringSchema },
    catchAsync(listFavorites)
  );
  app.post<{ Body: { entityType: string; entityId: string } }>(
    '/favorites',
    { preHandler: authenticate, schema: addFavoriteBodySchema },
    catchAsync(addFavorite)
  );
  app.delete<{ Params: { entityType: string; entityId: string } }>(
    '/favorites/:entityType/:entityId',
    { preHandler: authenticate, schema: favoriteEntityParamsSchema },
    catchAsync(removeFavorite)
  );

  app.get('/cart', { preHandler: authenticate }, catchAsync(getCart));
  app.post<{ Body: { productId: string; quantity: number; sku?: string } }>(
    '/cart',
    { preHandler: authenticate, schema: cartBodySchema },
    catchAsync(addToCart)
  );
  app.patch<{
    Body: {
      productId?: string;
      quantity?: number;
      updates?: { productId: string; quantity: number }[];
    };
  }>('/cart', { preHandler: authenticate, schema: updateCartBodySchema }, catchAsync(updateCart));
  app.delete<{
    Params: { productId: string };
    Querystring: { sku?: string };
  }>(
    '/cart/:productId',
    { preHandler: authenticate, schema: cartProductIdParamSchema },
    catchAsync(removeFromCart)
  );
  app.delete('/cart', { preHandler: authenticate }, catchAsync(clearCart));

  app.get<{ Querystring: { page?: string; limit?: string; status?: string } }>(
    '/me/community/questions',
    { preHandler: authenticate },
    catchAsync(listMyCommunityQuestions)
  );
  app.get<{ Params: { id: string } }>(
    '/me/community/questions/:id',
    { preHandler: authenticate },
    catchAsync(getMyCommunityQuestion)
  );
  app.patch<{ Params: { id: string } }>(
    '/me/community/questions/:id/close',
    { preHandler: authenticate },
    catchAsync(closeMyCommunityQuestion)
  );
  app.get<{ Querystring: { page?: string; limit?: string } }>(
    '/me/community/testimonies',
    { preHandler: authenticate },
    catchAsync(listMyCommunityTestimonies)
  );
  app.get<{ Querystring: { page?: string; limit?: string } }>(
    '/me/community/prayer-requests',
    { preHandler: authenticate },
    catchAsync(listMyCommunityPrayerRequests)
  );
  app.get<{ Querystring: { page?: string; limit?: string } }>(
    '/me/community/polls',
    { preHandler: authenticate },
    catchAsync(listMyCommunityPolls)
  );
  app.patch<{ Params: { id: string } }>(
    '/me/community/polls/:id/close',
    { preHandler: authenticate },
    catchAsync(closeMyCommunityPoll)
  );
}
