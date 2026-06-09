import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { getAuthUser } from '../../utils/getAuthUser';
import { sendResponse } from '../../utils/response';
import type { OrderStatus } from '../../utils/marketplaceProduct';
import * as vendorService from '../../services/vendor.service';

function requireClientAccess(request: FastifyRequest): string {
  const auth = getAuthUser(request);

  if (!auth || auth.scope !== 'client-access') {
    throw new AppError('Unauthorized', 401);
  }

  return auth.userId;
}

export async function getDashboardStats(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const data = await vendorService.loadVendorDashboardStats(requireClientAccess(request));

  sendResponse(reply, 200, data, 'Vendor dashboard stats loaded.');
}

export async function getVendorMe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const data = await vendorService.loadVendorMe(requireClientAccess(request));

  sendResponse(reply, 200, data, 'Vendor profile loaded.');
}

export async function deactivateVendorMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await vendorService.deactivateVendorProfile(requireClientAccess(request));

  sendResponse(reply, 200, { success: true }, 'Vendor store deactivated.');
}

export async function reactivateVendorMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await vendorService.reactivateVendorProfile(requireClientAccess(request));

  sendResponse(reply, 200, { success: true }, 'Vendor store reactivated.');
}

export async function submitVendorAppeal(
  request: FastifyRequest<{ Body: { message?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const data = await vendorService.submitVendorProfileAppeal(
    requireClientAccess(request),
    request.body?.message ?? ''
  );

  sendResponse(reply, 201, data, 'Appeal submitted.');
}

export async function getVendorProducts(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      status?: string;
      category?: string;
      search?: string;
      isFeatured?: string;
      sort?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await vendorService.listVendorProducts(requireClientAccess(request), request.query);

  sendResponse(reply, 200, data, 'Products loaded.');
}

export async function createProduct(
  request: FastifyRequest<{
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
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await vendorService.createVendorProduct(requireClientAccess(request), request.body);

  sendResponse(reply, 201, data, 'Product created.');
}

export async function updateProduct(
  request: FastifyRequest<{
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
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await vendorService.updateVendorProduct(
    requireClientAccess(request),
    request.params.productId,
    request.body
  );

  sendResponse(reply, 200, data, 'Product updated.');
}

export async function getVendorOrders(
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
  const data = await vendorService.listVendorOrders(requireClientAccess(request), request.query);

  sendResponse(reply, 200, data, 'Orders loaded.');
}

export async function updateVendorOrder(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { status: OrderStatus };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await vendorService.updateVendorOrderStatus(
    requireClientAccess(request),
    request.params.id,
    request.body.status
  );

  sendResponse(reply, 200, data, 'Order status updated.');
}

export async function updateVendorSettings(
  request: FastifyRequest<{
    Body: {
      storeName?: string;
      storeDescription?: string;
      email?: string;
      phone?: string;
      logo?: string;
      coverImage?: string;
      whatsapp?: string;
      address?: string;
      bankAccountName?: string;
      bankAccountNumber?: string;
      bankName?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const data = await vendorService.updateVendorSettings(requireClientAccess(request), request.body);

  sendResponse(reply, 200, data, 'Vendor settings updated.');
}
