import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import {
  getCategories,
  getSubCategories,
  getVendors,
  getVendorBySlug,
  getProducts,
  getProductBySlug,
  becomeVendor,
  placeOrder,
  getMyOrders,
  getOrderWhatsappLink,
} from '../controllers/marketplace/marketplace.controller';
import {
  listProductsQuerystringSchema,
  listOrdersQuerystringSchema,
  becomeVendorBodySchema,
  placeOrderBodySchema,
} from '../controllers/marketplace/marketplace.validation';

export async function registerMarketplaceRoutes(app: FastifyInstance): Promise<void> {
  app.get('/categories', catchAsync(getCategories));
  app.get('/subcategories', catchAsync(getSubCategories));
  app.get('/vendors', catchAsync(getVendors));
  app.get<{ Params: { slug: string } }>(
    '/vendors/:slug',
    catchAsync(getVendorBySlug)
  );
  app.get<{
    Querystring: { category?: string; featured?: string; limit?: string; page?: string };
  }>('/products', { schema: listProductsQuerystringSchema }, catchAsync(getProducts));
  app.get<{ Params: { slug: string } }>(
    '/products/:slug',
    catchAsync(getProductBySlug)
  );
  app.post<{
    Body: {
      storeName: string;
      storeDescription?: string;
      email: string;
      phone: string;
      whatsapp?: string;
      address?: string;
      bankAccountName?: string;
      bankAccountNumber?: string;
      bankName?: string;
    };
  }>('/become-vendor', { schema: becomeVendorBodySchema }, catchAsync(becomeVendor));
  app.post<{
    Body: {
      customer: { name: string; email: string; phone: string; address?: string };
      items: Array<{
        productId: string;
        productName?: string;
        quantity: number;
        price: number;
        sku?: string;
      }>;
    };
  }>('/orders', { schema: placeOrderBodySchema }, catchAsync(placeOrder));
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      status?: string;
      search?: string;
      sort?: string;
    };
  }>('/orders', { preHandler: authenticate, schema: listOrdersQuerystringSchema }, catchAsync(getMyOrders));
  app.get<{ Params: { orderId: string } }>(
    '/orders/:orderId/whatsapp-link',
    { preHandler: authenticate },
    catchAsync(getOrderWhatsappLink)
  );
}
