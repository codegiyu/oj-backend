import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { getAuthUser } from '../../utils/getAuthUser';
import { sendResponse } from '../../utils/response';
import * as marketplaceService from '../../services/marketplace.service';

function requireClientAccess(request: FastifyRequest): string {
  const auth = getAuthUser(request);

  if (!auth || auth.scope !== 'client-access') {
    throw new AppError('Unauthorized', 401);
  }

  return auth.userId;
}

export async function getCategories(
  request: FastifyRequest<{ Querystring: { includeInactive?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const includeInactive = request.query.includeInactive === '1';
  const data = await marketplaceService.loadCategories(includeInactive);

  sendResponse(reply, 200, data, 'Categories loaded.');
}

export async function getSubCategories(
  request: FastifyRequest<{ Querystring: { category?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const data = await marketplaceService.loadSubCategories(request.query.category);

  sendResponse(reply, 200, data, 'Subcategories loaded.');
}

export async function getVendors(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      q?: string;
      featured?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await marketplaceService.listMarketplaceVendors(request.query);

  sendResponse(reply, 200, data, 'Vendors loaded.');
}

export async function getVendorBySlug(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const data = await marketplaceService.loadVendorBySlug(request.params.slug);

  sendResponse(reply, 200, data, 'Vendor loaded.');
}

export async function getProducts(
  request: FastifyRequest<{
    Querystring: {
      category?: string;
      subCategory?: string;
      vendor?: string;
      featured?: string;
      limit?: string;
      page?: string;
      search?: string;
      q?: string;
      sort?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await marketplaceService.listMarketplaceProducts(request.query);

  sendResponse(reply, 200, data, 'Products loaded.');
}

export async function getProductBySlug(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const data = await marketplaceService.loadProductBySlug(request.params.slug);

  sendResponse(reply, 200, data, 'Product loaded.');
}

export async function becomeVendor(
  request: FastifyRequest<{
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
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await marketplaceService.becomeVendor(requireClientAccess(request), request.body);

  sendResponse(reply, result.statusCode, result.data, result.message);
}

export async function placeOrder(
  request: FastifyRequest<{
    Body: {
      customer: { name: string; email: string; phone: string; address?: string };
      notes?: string;
      items: Array<{
        productId: string;
        productName?: string;
        quantity: number;
        price: number;
        sku?: string;
      }>;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  const result = await marketplaceService.placeMarketplaceOrder(request.body, auth);

  if (result.single) {
    sendResponse(reply, 201, { order: result.order }, 'Order placed.');
  } else {
    sendResponse(reply, 201, { orders: result.orders }, 'Orders placed.');
  }
}

export async function getMyOrders(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      status?: string;
      search?: string;
      sort?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await marketplaceService.listMyMarketplaceOrders(
    requireClientAccess(request),
    request.query
  );

  sendResponse(reply, 200, data, 'Orders loaded.');
}

export async function getOrderWhatsappLink(
  request: FastifyRequest<{ Params: { orderId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await marketplaceService.loadOrderWhatsappLink(
    requireClientAccess(request),
    request.params.orderId
  );

  if (!result.hasLink) {
    sendResponse(
      reply,
      200,
      { whatsappLink: null, message: result.message },
      'Vendor WhatsApp not configured for this order.'
    );
    return;
  }

  sendResponse(
    reply,
    200,
    { whatsappLink: result.whatsappLink, message: result.message },
    'WhatsApp link generated.'
  );
}
