/* Mongoose lean docs are typed loosely; match artist.service eslint baseline. */

import mongoose from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import type { ModelVendor, PopulatedOrder } from '../lib/types/constants';
import { Product } from '../models/product';
import { AppError } from '../utils/AppError';
import {
  generateVendorProductSlug,
  parsePositiveInteger,
  parseSearch,
  parseString,
  normalizeSort,
} from '../utils/helpers';
import { assertVendorAccountOperational } from '../controllers/vendor/vendorAccess';
import { mapPopulatedOrderToApi } from '../utils/mapPopulatedOrder';
import { ORDER_STATUSES, type OrderStatus } from '../utils/marketplaceProduct';
import {
  assertOwnerUserNotSuspended,
  deactivateRoleProfile,
  reactivateRoleProfile,
  createRoleProfileAppeal,
  loadAppealSummariesForProfile,
  shapeRolePortalMeta,
} from './roleProfileLifecycle.service';
import { parseObjectId } from '../controllers/admin/admin.helpers';
import { serializeDocIds } from '../controllers/artist/artist.helpers';
import * as vendorRepo from '../repositories/vendor/vendor.repository';
import { healVendorIdForUser } from './roleProfileLink.service';

const PRODUCT_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'price', 'displayOrder', 'status'];
const ORDER_SORT_FIELDS = ['createdAt', 'updatedAt', 'orderNumber', 'totalAmount', 'status'];

const PENDING_ORDER_STATUSES = ['pending', 'confirmed', 'processing'];

async function getVendorForUser(userId: string): Promise<HydratedDocument<ModelVendor>> {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  let user = await vendorRepo.findUserVendorFields(userObjectId);
  let vendorId = user?.vendorId ?? null;

  if (!vendorId) {
    vendorId = await healVendorIdForUser(userObjectId);
    if (vendorId) {
      user = await vendorRepo.findUserVendorFields(userObjectId);
      vendorId = user?.vendorId ?? vendorId;
    }
  }

  if (!vendorId) throw new AppError('You do not have an associated vendor profile', 403);

  const vendor = await vendorRepo.findVendorDocumentById(vendorId);
  if (!vendor) throw new AppError('Vendor not found', 404);
  return vendor;
}

async function getVendorForUserOperational(userId: string): Promise<HydratedDocument<ModelVendor>> {
  await assertOwnerUserNotSuspended(userId);
  const vendor = await getVendorForUser(userId);
  assertVendorAccountOperational(vendor.status);
  return vendor;
}

export async function loadVendorDashboardStats(userId: string) {
  const vendor = await getVendorForUserOperational(userId);
  const vendorId = vendor._id;

  const [productsCount, pendingOrdersCount, totalPaidRevenue] = await Promise.all([
    vendorRepo.countProductsForVendor(vendorId),
    vendorRepo.countPendingOrdersForVendor(vendorId, PENDING_ORDER_STATUSES),
    vendorRepo.aggregatePaidRevenueForVendor(vendorId),
  ]);

  return {
    productsCount,
    pendingOrdersCount,
    totalPaidRevenue,
  };
}

export async function loadVendorMe(userId: string) {
  const vendor = await getVendorForUser(userId);
  const appeals = await loadAppealSummariesForProfile('vendor', vendor._id);
  const count = await vendorRepo.countProductsForVendor(vendor._id);
  const raw = serializeDocIds(vendor.toObject() as unknown as Record<string, unknown>);

  return {
    ...raw,
    productCount: count,
    ...shapeRolePortalMeta('vendor', raw, appeals),
  };
}

export async function deactivateVendorProfile(userId: string): Promise<void> {
  const vendor = await getVendorForUser(userId);
  await deactivateRoleProfile({
    profileType: 'vendor',
    profileId: vendor._id,
    userId: parseObjectId(userId, 'userId'),
  });
}

export async function reactivateVendorProfile(userId: string): Promise<void> {
  const vendor = await getVendorForUser(userId);
  await reactivateRoleProfile({
    profileType: 'vendor',
    profileId: vendor._id,
    userId: parseObjectId(userId, 'userId'),
  });
}

export async function submitVendorProfileAppeal(userId: string, message: string) {
  const vendor = await getVendorForUser(userId);
  const appeal = await createRoleProfileAppeal({
    profileType: 'vendor',
    profileId: vendor._id,
    userId: parseObjectId(userId, 'userId'),
    message,
  });

  return { appeal };
}

export async function listVendorProducts(
  userId: string,
  query: {
    page?: string;
    limit?: string;
    status?: string;
    category?: string;
    search?: string;
    isFeatured?: string;
    sort?: string;
  }
) {
  const vendor = await getVendorForUserOperational(userId);

  const limit = parsePositiveInteger(query.limit, 20, 100);
  const page = parsePositiveInteger(query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(query.search);
  const status = parseString(query.status);
  const categoryId = parseString(query.category);
  const isFeatured =
    query.isFeatured === 'true' ? true : query.isFeatured === 'false' ? false : undefined;
  const sortStr = normalizeSort(query.sort, PRODUCT_SORT_FIELDS, 'displayOrder -createdAt');

  const filter: Record<string, unknown> = { vendor: vendor._id };
  if (status) filter.status = status;
  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    filter.category = new mongoose.Types.ObjectId(categoryId);
  }
  if (isFeatured !== undefined) filter.isFeatured = isFeatured;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const [products, total] = await Promise.all([
    vendorRepo.listVendorProducts({ filter, sort: sortStr, skip, limit }),
    vendorRepo.countVendorProducts(filter),
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

export async function createVendorProduct(
  userId: string,
  body: {
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
  }
) {
  const vendor = await getVendorForUserOperational(userId);

  let categoryId: mongoose.Types.ObjectId | null = null;
  let subCategoryId: mongoose.Types.ObjectId | null = null;

  if (body.category) {
    if (!mongoose.Types.ObjectId.isValid(body.category)) {
      throw new AppError('Invalid category id', 400);
    }

    const category = await vendorRepo.findCategoryById(new mongoose.Types.ObjectId(body.category));

    if (!category) throw new AppError('Category not found', 400);

    categoryId = category._id;
  }

  if (body.subCategory) {
    if (!mongoose.Types.ObjectId.isValid(body.subCategory)) {
      throw new AppError('Invalid subCategory id', 400);
    }
    const sub = await vendorRepo.findSubCategoryById(new mongoose.Types.ObjectId(body.subCategory));
    if (!sub) throw new AppError('SubCategory not found', 400);
    subCategoryId = sub._id;
    if (categoryId && sub.category.toString() !== categoryId.toString()) {
      throw new AppError('SubCategory does not belong to the specified category', 400);
    }
    if (!categoryId) {
      categoryId = sub.category;
    }
  }

  const slug = await generateVendorProductSlug(Product, vendor._id, body.name, vendor.slug);

  const hasVariations =
    Array.isArray(body.variationOptions) &&
    body.variationOptions.length > 0 &&
    Array.isArray(body.variants) &&
    body.variants.length > 0;

  const product = await vendorRepo
    .createProductRecord({
      name: body.name,
      slug,
      vendor: vendor._id,
      description: body.description ?? '',
      category: categoryId,
      subCategory: subCategoryId,
      tags: Array.isArray(body.tags) ? body.tags : [],
      price: body.price,
      images: body.images ?? [],
      inStock: hasVariations ? true : (body.inStock ?? true),
      variationOptions: hasVariations ? body.variationOptions : undefined,
      variants: hasVariations ? body.variants : undefined,
      status: 'draft',
      isFeatured: body.isFeatured ?? false,
      displayOrder: 0,
    })
    .catch((err: unknown) => {
      throw new AppError(err instanceof Error ? err.message : 'Product validation failed', 400);
    });

  const populated = await vendorRepo.findProductPopulatedById(product._id);

  return populated as unknown as Record<string, unknown>;
}

export async function updateVendorProduct(
  userId: string,
  productId: string,
  body: {
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
  }
) {
  const vendor = await getVendorForUserOperational(userId);

  const product = await vendorRepo.findProductDocumentForVendor(
    new mongoose.Types.ObjectId(productId),
    vendor._id
  );

  if (!product) throw new AppError('Product not found', 404);

  let categoryId: mongoose.Types.ObjectId | null | undefined = undefined;
  let subCategoryId: mongoose.Types.ObjectId | null | undefined = undefined;

  if (body.category !== undefined) {
    if (body.category === null) {
      categoryId = null;
    } else {
      if (!mongoose.Types.ObjectId.isValid(body.category)) {
        throw new AppError('Invalid category id', 400);
      }

      const category = await vendorRepo.findCategoryById(
        new mongoose.Types.ObjectId(body.category)
      );

      if (!category) throw new AppError('Category not found', 400);

      categoryId = category._id;
    }
  }

  if (body.subCategory !== undefined) {
    if (body.subCategory === null) {
      subCategoryId = null;
    } else {
      if (!mongoose.Types.ObjectId.isValid(body.subCategory)) {
        throw new AppError('Invalid subCategory id', 400);
      }

      const sub = await vendorRepo.findSubCategoryById(
        new mongoose.Types.ObjectId(body.subCategory)
      );

      if (!sub) throw new AppError('SubCategory not found', 400);

      subCategoryId = sub._id;

      const effectiveCategoryId =
        categoryId !== undefined
          ? categoryId
          : (product.category as mongoose.Types.ObjectId | null);

      if (effectiveCategoryId && sub.category.toString() !== effectiveCategoryId.toString()) {
        throw new AppError('SubCategory does not belong to the specified category', 400);
      }

      if (categoryId === undefined && !product.category) {
        categoryId = sub.category;
      }
    }
  }

  if (body.name !== undefined) product.name = body.name;
  if (body.description !== undefined) product.description = body.description;
  if (categoryId !== undefined) product.category = categoryId;
  if (subCategoryId !== undefined) product.subCategory = subCategoryId;
  if (body.tags !== undefined) product.tags = Array.isArray(body.tags) ? body.tags : [];
  if (body.price !== undefined) product.price = body.price;
  if (body.images !== undefined) product.images = body.images;
  if (body.inStock !== undefined) product.inStock = body.inStock;
  if (body.variationOptions !== undefined) product.variationOptions = body.variationOptions;
  if (body.variants !== undefined) {
    product.variants = body.variants.map(v => ({
      ...v,
      isDefault: v.isDefault ?? false,
    }));
  }
  if (body.status !== undefined) product.status = body.status;
  if (body.isFeatured !== undefined) product.isFeatured = body.isFeatured;

  await product.save().catch((err: unknown) => {
    throw new AppError(err instanceof Error ? err.message : 'Product validation failed', 400);
  });

  const updated = await vendorRepo.findProductPopulatedById(product._id);

  return updated as unknown as Record<string, unknown>;
}

function mapVendorOrderListItem(order: PopulatedOrder) {
  const vendorDoc = order.vendor;

  const vendorSummary = {
    _id:
      vendorDoc?._id != null
        ? (vendorDoc._id as mongoose.Types.ObjectId | null)?.toString()
        : order.vendor,
    name: vendorDoc?.name,
    slug: vendorDoc?.slug,
    storeName: vendorDoc?.storeName,
  };

  const items =
    order.items?.map(item => {
      const productDoc = item.product;
      const product =
        productDoc && typeof productDoc === 'object' && productDoc._id
          ? {
              _id: productDoc._id.toString(),
              name: productDoc.name,
              slug: productDoc.slug,
              image: Array.isArray(productDoc.images) ? productDoc.images[0] : productDoc.image,
            }
          : {
              _id:
                item.product != null
                  ? (item.product as mongoose.Types.ObjectId | null)?.toString()
                  : '',
              name: item.productName ?? '',
              slug: '',
              image: undefined,
            };

      return {
        product,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice ?? item.quantity * item.price,
        ...(item.sku ? { sku: item.sku } : {}),
        ...(item.selectedOptions && Object.keys(item.selectedOptions).length > 0
          ? { selectedOptions: item.selectedOptions }
          : {}),
      };
    }) ?? [];

  return {
    _id: order._id.toString(),
    orderNumber: order.orderNumber,
    customer: order.customer,
    vendor: vendorSummary,
    items,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export async function listVendorOrders(
  userId: string,
  query: {
    page?: string;
    limit?: string;
    status?: string;
    search?: string;
    sort?: string;
  }
) {
  const vendor = await getVendorForUserOperational(userId);

  const limit = parsePositiveInteger(query.limit, 20, 100);
  const page = parsePositiveInteger(query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(query.search);
  const status = parseString(query.status);
  const sortStr = normalizeSort(query.sort, ORDER_SORT_FIELDS, '-createdAt');

  const filter: Record<string, unknown> = { vendor: vendor._id };
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { 'customer.name': { $regex: search, $options: 'i' } },
      { 'customer.email': { $regex: search, $options: 'i' } },
      { 'customer.phone': { $regex: search, $options: 'i' } },
    ];
  }

  const [orders, total] = await Promise.all([
    vendorRepo.listVendorOrders({ filter, sort: sortStr, skip, limit }),
    vendorRepo.countVendorOrders(filter),
  ]);

  const mapped = orders.map(mapVendorOrderListItem);

  return {
    orders: mapped,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

export async function updateVendorOrderStatus(
  userId: string,
  orderId: string,
  status: OrderStatus
) {
  const vendor = await getVendorForUserOperational(userId);

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError('Invalid order id', 400);
  }

  if (!ORDER_STATUSES.includes(status)) {
    throw new AppError('Invalid order status', 400);
  }

  const order = await vendorRepo.updateVendorOrderStatus({
    orderId: new mongoose.Types.ObjectId(orderId),
    vendorId: vendor._id,
    status,
  });

  if (!order) throw new AppError('Order not found', 404);

  return { order: mapPopulatedOrderToApi(order) };
}

export async function updateVendorSettings(
  userId: string,
  body: {
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
  }
) {
  const vendor = await getVendorForUserOperational(userId);

  if (body.storeName !== undefined) vendor.storeName = body.storeName;
  if (body.storeDescription !== undefined) vendor.storeDescription = body.storeDescription;
  if (body.email !== undefined) vendor.email = body.email;
  if (body.phone !== undefined) vendor.phone = body.phone;
  if (body.logo !== undefined) vendor.logo = body.logo;
  if (body.coverImage !== undefined) vendor.coverImage = body.coverImage;
  if (body.whatsapp !== undefined) vendor.whatsapp = body.whatsapp;
  if (body.address !== undefined) vendor.address = body.address;
  if (body.bankAccountName !== undefined) vendor.bankAccountName = body.bankAccountName;
  if (body.bankAccountNumber !== undefined) vendor.bankAccountNumber = body.bankAccountNumber;
  if (body.bankName !== undefined) vendor.bankName = body.bankName;
  await vendor.save();

  return vendor.toObject() as unknown as Record<string, unknown>;
}
