import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Product } from '../../models/product';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { requireAdmin, parseObjectId } from './admin.helpers';
import { shapeProductItem } from './productAdmin.shapes';
import { createAdminProductRecord } from '../../services/admin/productAdmin.service';
import { runAdminList, runAdminGet } from '../../services/admin/runAdminListGet';
import {
  listAdminProductRows,
  findAdminProductById,
} from '../../repositories/admin/product.repository';
import {
  schedulePublishedContentRevalidation,
  scheduleFrontendRevalidation,
} from '../../services/frontendRevalidation.service';
import { invalidateRelatedProductsCache } from '../../services/relatedProductsLoader.service';
import {
  applyMarketplaceCategoryFilter,
  applyVendorFilter,
} from '../../services/admin/adminListFilters';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'price', 'displayOrder', 'status'];

export async function listAdminProducts(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
      vendor?: string;
      category?: string;
      sort?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: SORT_FIELDS,
    searchFields: ['name', 'description', 'slug'],
    extendFilter: (filter, query) => {
      applyVendorFilter(filter, query.vendor);
      applyMarketplaceCategoryFilter(filter, query.category);
    },
    listRows: listAdminProductRows,
    shapeItem: shapeProductItem,
    collectionKey: 'products',
    message: 'Products list loaded.',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminProduct(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminGet(request, {
    findById: findAdminProductById,
    shapeItem: shapeProductItem,
    itemKey: 'product',
    message: 'Product loaded.',
    notFoundMessage: 'Product not found',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function createAdminProduct(
  request: FastifyRequest<{
    Body: {
      name: string;
      vendorId: string;
      description?: string;
      category?: string | null;
      subCategory?: string | null;
      tags?: string[];
      price: number;
      images?: string[];
      inStock?: boolean;
      isFeatured?: boolean;
      status?: 'draft' | 'published' | 'archived';
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
  const populated = await createAdminProductRecord(request.body);

  sendResponse(
    reply,
    201,
    { product: shapeProductItem((populated ?? {}) as unknown as Record<string, unknown>) },
    'Product created.'
  );
}

export async function updateAdminProduct(
  request: FastifyRequest<{
    Params: { id: string };
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
  const id = parseObjectId(request.params.id);
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);

  const body = request.body ?? {};
  if (body.name !== undefined) product.name = body.name;
  if (body.description !== undefined) product.description = body.description;
  if (body.tags !== undefined) product.tags = body.tags;
  if (body.price !== undefined) product.price = body.price;
  if (body.images !== undefined) product.images = body.images;
  if (body.inStock !== undefined) product.inStock = body.inStock;
  if (body.status !== undefined) product.status = body.status;
  if (body.isFeatured !== undefined) product.isFeatured = body.isFeatured;
  if (body.variationOptions !== undefined)
    product.variationOptions = body.variationOptions as never;
  if (body.variants !== undefined) product.variants = body.variants as never;

  if (body.category !== undefined) {
    product.category =
      body.category && mongoose.Types.ObjectId.isValid(body.category)
        ? (new mongoose.Types.ObjectId(body.category) as never)
        : null;
  }
  if (body.subCategory !== undefined) {
    product.subCategory =
      body.subCategory && mongoose.Types.ObjectId.isValid(body.subCategory)
        ? (new mongoose.Types.ObjectId(body.subCategory) as never)
        : null;
  }

  await product.save();

  await invalidateRelatedProductsCache(String(product._id));

  const populated = await Product.findById(product._id)
    .populate('vendor', 'name slug storeName')
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug')
    .lean();
  if (product.status === 'published') {
    schedulePublishedContentRevalidation('marketplace_product', product.slug);
  }
  sendResponse(
    reply,
    200,
    {
      product: shapeProductItem(
        (populated ?? product.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Product updated.'
  );
}

export async function deleteAdminProduct(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);
  const slug = product.slug;
  const result = await Product.findByIdAndDelete(id);
  if (!result) throw new AppError('Product not found', 404);
  scheduleFrontendRevalidation([
    '/marketplace',
    '/marketplace/products',
    `/marketplace/products/${encodeURIComponent(slug)}`,
  ]);
  sendResponse(reply, 200, { success: true }, 'Product deleted.');
}

export async function approveAdminProduct(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);

  product.status = 'published';
  product.approvedAt = new Date();
  product.approvedBy = new mongoose.Types.ObjectId(userId);
  product.rejectionReason = '';
  product.rejectedAt = null;
  product.rejectedBy = null;
  await product.save();

  await invalidateRelatedProductsCache(String(product._id));

  const populated = await Product.findById(product._id)
    .populate('vendor', 'name slug storeName')
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug')
    .lean();
  schedulePublishedContentRevalidation('marketplace_product', product.slug);
  sendResponse(
    reply,
    200,
    {
      product: shapeProductItem(
        (populated ?? product.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Product approved.'
  );
}

export async function rejectAdminProduct(
  request: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found', 404);

  const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';
  product.status = 'archived';
  product.rejectionReason = reason;
  product.rejectedAt = new Date();
  product.rejectedBy = new mongoose.Types.ObjectId(userId);
  product.approvedAt = null;
  product.approvedBy = null;
  await product.save();

  await invalidateRelatedProductsCache(String(product._id));

  const populated = await Product.findById(product._id)
    .populate('vendor', 'name slug storeName')
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug')
    .lean();
  sendResponse(
    reply,
    200,
    {
      product: shapeProductItem(
        (populated ?? product.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Product rejected.'
  );
}
