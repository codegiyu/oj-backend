import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import {
  getVendorMe,
  getDashboardStats,
  getVendorProducts,
  createProduct,
  updateProduct,
  getVendorOrders,
  updateVendorSettings,
} from '../controllers/vendor/vendor.controller';
import {
  createProductBodySchema,
  updateProductBodySchema,
  updateVendorSettingsBodySchema,
} from '../controllers/vendor/vendor.validation';

export async function registerVendorRoutes(app: FastifyInstance): Promise<void> {
  app.get('/me', { preHandler: authenticate }, catchAsync(getVendorMe));
  app.get('/dashboard-stats', { preHandler: authenticate }, catchAsync(getDashboardStats));
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
  }>('/products', { preHandler: authenticate }, catchAsync(getVendorProducts));
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
      variants?: Array<{ options: Record<string, string>; price: number; inStock: boolean; isDefault?: boolean; sku?: string; image?: string }>;
    };
  }>(
    '/products',
    { preHandler: authenticate, schema: createProductBodySchema },
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
      variants?: Array<{ options: Record<string, string>; price: number; inStock: boolean; isDefault?: boolean; sku?: string; image?: string }>;
    };
  }>(
    '/products/:productId',
    { preHandler: authenticate, schema: updateProductBodySchema },
    catchAsync(updateProduct)
  );
  app.get<{ Querystring: { status?: string } }>(
    '/orders',
    { preHandler: authenticate },
    catchAsync(getVendorOrders)
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
    { preHandler: authenticate, schema: updateVendorSettingsBodySchema },
    catchAsync(updateVendorSettings)
  );
}
