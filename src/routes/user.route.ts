import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import {
  getMe,
  updateMe,
  listWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../controllers/user/user.controller';
import {
  updateMeBodySchema,
  addToWishlistBodySchema,
  listWishlistQuerystringSchema,
  wishlistProductIdParamSchema,
} from '../controllers/user/user.validation';

export async function registerUserRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', { preHandler: authenticate }, catchAsync(getMe));
  app.patch<{
    Body: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string; avatar?: string };
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
}

