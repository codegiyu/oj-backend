import { FastifyInstance } from 'fastify';
import { authenticatePreHandler } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import {
  getVendorMe,
  deactivateVendorMe,
  reactivateVendorMe,
  submitVendorAppeal,
  getDashboardStats,
  getVendorProducts,
  createProduct,
  updateProduct,
  getVendorOrders,
  updateVendorOrder,
  updateVendorSettings,
} from '../controllers/vendor/vendor.controller';
import {
  createProductBodySchema,
  updateProductBodySchema,
  updateVendorOrderBodySchema,
  updateVendorSettingsBodySchema,
} from '../controllers/vendor/vendor.validation';

export function registerVendorRoutes(app: FastifyInstance): void {
  app.get('/me', { preHandler: [authenticatePreHandler] }, catchAsync(getVendorMe));
  app.post(
    '/me/deactivate',
    { preHandler: [authenticatePreHandler] },
    catchAsync(deactivateVendorMe)
  );
  app.post(
    '/me/reactivate',
    { preHandler: [authenticatePreHandler] },
    catchAsync(reactivateVendorMe)
  );
  app.post<{ Body: { message?: string } }>(
    '/me/appeals',
    { preHandler: [authenticatePreHandler] },
    catchAsync(submitVendorAppeal)
  );
  app.get(
    '/dashboard-stats',
    { preHandler: [authenticatePreHandler] },
    catchAsync(getDashboardStats)
  );
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      status?: string;
      category?: string;
      search?: string;
      isFeatured?: string;
      sort?: string;
    };
  }>('/products', { preHandler: [authenticatePreHandler] }, catchAsync(getVendorProducts));
  app.post<{
    Body: {
      name: string;
      description?: string;
      category?: string | null;
      subCategory?: string | null;
      tags?: string[];
      price: number;
      images?: string[];
      inStock?: boolean;
      isFeatured?: boolean;
      variationOptions?: Array<{ name: string; values: string[] }>;
      variants?: Array<{
        options: Record<string, string>;
        price: number;
        inStock: boolean;
        isDefault?: boolean;
        sku?: string;
        image?: string;
      }>;
    };
  }>(
    '/products',
    { preHandler: [authenticatePreHandler], schema: createProductBodySchema },
    catchAsync(createProduct)
  );
  app.patch<{
    Params: { productId: string };
    Body: {
      name?: string;
      description?: string;
      category?: string | null;
      subCategory?: string | null;
      tags?: string[];
      price?: number;
      images?: string[];
      inStock?: boolean;
      status?: 'draft' | 'published' | 'archived';
      isFeatured?: boolean;
      variationOptions?: Array<{ name: string; values: string[] }>;
      variants?: Array<{
        options: Record<string, string>;
        price: number;
        inStock: boolean;
        isDefault?: boolean;
        sku?: string;
        image?: string;
      }>;
    };
  }>(
    '/products/:productId',
    { preHandler: [authenticatePreHandler], schema: updateProductBodySchema },
    catchAsync(updateProduct)
  );
  app.get<{ Querystring: { status?: string } }>(
    '/orders',
    { preHandler: [authenticatePreHandler] },
    catchAsync(getVendorOrders)
  );
  app.patch<{ Params: { id: string }; Body: { status: string } }>(
    '/orders/:id',
    {
      preHandler: [authenticatePreHandler],
      schema: updateVendorOrderBodySchema,
    },
    catchAsync(updateVendorOrder)
  );
  app.patch<{
    Body: {
      storeName?: string;
      storeDescription?: string;
      email?: string;
      phone?: string;
      logo?: string;
      coverImage?: string;
    };
  }>(
    '/settings',
    { preHandler: [authenticatePreHandler], schema: updateVendorSettingsBodySchema },
    catchAsync(updateVendorSettings)
  );
}
