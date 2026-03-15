import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Vendor } from '../../models/vendor';
import { Product } from '../../models/product';
import { Order } from '../../models/order';
import { User } from '../../models/user';
import { Category } from '../../models/category';
import { SubCategory } from '../../models/subCategory';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { getAuthUser } from '../../utils/getAuthUser';
import {
  slugify,
  parsePositiveInteger,
  parseSearch,
  parseString,
  normalizeSort,
} from '../../utils/helpers';

async function getVendorForUser(userId: string): Promise<InstanceType<typeof Vendor>> {
  const user = await User.findById(userId).select('vendorId').lean();
  if (!user?.vendorId) throw new AppError('Vendor profile not found', 404);
  const vendor = await Vendor.findById((user as { vendorId: mongoose.Types.ObjectId }).vendorId);
  if (!vendor) throw new AppError('Vendor not found', 404);
  return vendor;
}

/** Returns vendor or throws 403 (no vendor link) / 404 (vendor record missing). */
async function getVendorForUserStrict(userId: string): Promise<InstanceType<typeof Vendor>> {
  const user = await User.findById(userId).select('vendorId').lean();
  if (!user?.vendorId) throw new AppError('You do not have an associated vendor profile', 403);
  const vendor = await Vendor.findById((user as { vendorId: mongoose.Types.ObjectId }).vendorId);
  if (!vendor) throw new AppError('Vendor not found', 404);
  return vendor;
}

export async function getDashboardStats(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const vendor = await getVendorForUserStrict(auth.userId);
  const vendorId = vendor._id;

  const PENDING_ORDER_STATUSES = ['pending', 'confirmed', 'processing'];

  const [productsCount, pendingOrdersCount, revenueResult] = await Promise.all([
    Product.countDocuments({ vendor: vendorId }),
    Order.countDocuments({
      vendor: vendorId,
      status: { $in: PENDING_ORDER_STATUSES },
    }),
    Order.aggregate<{ total: number }>([
      { $match: { vendor: vendorId, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
  ]);

  const totalPaidRevenue = revenueResult[0]?.total ?? 0;

  sendResponse(reply, 200, {
    productsCount,
    pendingOrdersCount,
    totalPaidRevenue,
  }, 'Vendor dashboard stats loaded.');
}

export async function getVendorMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const vendor = await getVendorForUser(user.userId);
  const count = await Product.countDocuments({ vendor: vendor._id });
  sendResponse(reply, 200, { ...vendor.toObject(), productCount: count }, 'Vendor profile loaded.');
}

const PRODUCT_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'price', 'displayOrder', 'status'];

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
  const user = getAuthUser(request);
  if (!user || user.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const vendor = await getVendorForUser(user.userId);

  const limit = parsePositiveInteger(request.query.limit, 20, 100);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(request.query.search);
  const status = parseString(request.query.status);
  const categoryId = parseString(request.query.category);
  const isFeatured =
    request.query.isFeatured === 'true' ? true : request.query.isFeatured === 'false' ? false : undefined;
  const sortStr = normalizeSort(request.query.sort, PRODUCT_SORT_FIELDS, 'displayOrder -createdAt');

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
    Product.find(filter).sort(sortStr).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  sendResponse(reply, 200, {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  }, 'Products loaded.');
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
      variants?: Array<{ options: Record<string, string>; price: number; inStock: boolean; isDefault?: boolean; sku?: string; image?: string }>;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const vendor = await getVendorForUser(user.userId);
  const body = request.body;

  let categoryId: mongoose.Types.ObjectId | null = null;
  let subCategoryId: mongoose.Types.ObjectId | null = null;

  if (body.category) {
    if (!mongoose.Types.ObjectId.isValid(body.category)) {
      throw new AppError('Invalid category id', 400);
    }
    const category = await Category.findById(body.category).select('_id').lean();
    if (!category) throw new AppError('Category not found', 400);
    categoryId = category._id as mongoose.Types.ObjectId;
  }

  if (body.subCategory) {
    if (!mongoose.Types.ObjectId.isValid(body.subCategory)) {
      throw new AppError('Invalid subCategory id', 400);
    }
    const sub = await SubCategory.findById(body.subCategory)
      .select('_id category')
      .lean<{ _id: mongoose.Types.ObjectId; category: mongoose.Types.ObjectId } | null>();
    if (!sub) throw new AppError('SubCategory not found', 400);
    subCategoryId = sub._id;
    if (categoryId && sub.category.toString() !== categoryId.toString()) {
      throw new AppError('SubCategory does not belong to the specified category', 400);
    }
    if (!categoryId) {
      categoryId = sub.category;
    }
  }

  const baseSlug = slugify(body.name);
  let slug = baseSlug;
  let n = 0;
  while (await Product.findOne({ vendor: vendor._id, slug })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const hasVariations =
    Array.isArray(body.variationOptions) &&
    body.variationOptions.length > 0 &&
    Array.isArray(body.variants) &&
    body.variants.length > 0;

  const product = await Product.create({
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
  }).catch((err: unknown) => {
    throw new AppError(err instanceof Error ? err.message : 'Product validation failed', 400);
  });

  const populated = await Product.findById(product._id)
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug category')
    .lean();

  sendResponse(reply, 201, populated as unknown as Record<string, unknown>, 'Product created.');
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
      variants?: Array<{ options: Record<string, string>; price: number; inStock: boolean; isDefault?: boolean; sku?: string; image?: string }>;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const vendor = await getVendorForUser(user.userId);
  const product = await Product.findOne({
    _id: new mongoose.Types.ObjectId(request.params.productId),
    vendor: vendor._id,
  });
  if (!product) throw new AppError('Product not found', 404);
  const body = request.body;

  let categoryId: mongoose.Types.ObjectId | null | undefined = undefined;
  let subCategoryId: mongoose.Types.ObjectId | null | undefined = undefined;

  if (body.category !== undefined) {
    if (body.category === null) {
      categoryId = null;
    } else {
      if (!mongoose.Types.ObjectId.isValid(body.category)) {
        throw new AppError('Invalid category id', 400);
      }
      const category = await Category.findById(body.category).select('_id').lean();
      if (!category) throw new AppError('Category not found', 400);
      categoryId = category._id as mongoose.Types.ObjectId;
    }
  }

  if (body.subCategory !== undefined) {
    if (body.subCategory === null) {
      subCategoryId = null;
    } else {
      if (!mongoose.Types.ObjectId.isValid(body.subCategory)) {
        throw new AppError('Invalid subCategory id', 400);
      }
      const sub = await SubCategory.findById(body.subCategory)
        .select('_id category')
        .lean<{ _id: mongoose.Types.ObjectId; category: mongoose.Types.ObjectId } | null>();
      if (!sub) throw new AppError('SubCategory not found', 400);
      subCategoryId = sub._id;
      const effectiveCategoryId =
        categoryId !== undefined ? categoryId : (product.category as mongoose.Types.ObjectId | null);
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
  if (body.variants !== undefined) product.variants = body.variants;
  if (body.status !== undefined) product.status = body.status;
  if (body.isFeatured !== undefined) product.isFeatured = body.isFeatured;

  await product.save().catch((err: unknown) => {
    throw new AppError(err instanceof Error ? err.message : 'Product validation failed', 400);
  });

  const updated = await Product.findById(product._id)
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug category')
    .lean();

  sendResponse(reply, 200, updated as unknown as Record<string, unknown>, 'Product updated.');
}

const ORDER_SORT_FIELDS = ['createdAt', 'updatedAt', 'orderNumber', 'totalAmount', 'status'];

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
  const user = getAuthUser(request);
  if (!user || user.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const vendor = await getVendorForUser(user.userId);

  const limit = parsePositiveInteger(request.query.limit, 20, 100);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(request.query.search);
  const status = parseString(request.query.status);
  const sortStr = normalizeSort(request.query.sort, ORDER_SORT_FIELDS, '-createdAt');

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
    Order.find(filter)
      .sort(sortStr)
      .skip(skip)
      .limit(limit)
      .populate('vendor', 'name storeName slug')
      .populate('items.product', 'name slug images')
      .lean(),
    Order.countDocuments(filter),
  ]);

  const mapped = orders.map((order: any) => {
    const vendorDoc = order.vendor as any;
    const vendorSummary = {
      _id: (vendorDoc?._id ?? order.vendor)?.toString(),
      name: vendorDoc?.name,
      slug: vendorDoc?.slug,
      storeName: vendorDoc?.storeName,
    };

    const items =
      order.items?.map((item: any) => {
        const productDoc = item.product as any;
        const product = productDoc && typeof productDoc === 'object' && productDoc._id
          ? {
              _id: productDoc._id.toString(),
              name: productDoc.name,
              slug: productDoc.slug,
              image: Array.isArray(productDoc.images) ? productDoc.images[0] : productDoc.image,
            }
          : {
              _id: (item.product ?? '').toString(),
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
  });

  sendResponse(reply, 200, {
    orders: mapped,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  }, 'Orders loaded.');
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
  const user = getAuthUser(request);
  if (!user || user.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const vendor = await getVendorForUser(user.userId);
  const body = request.body;
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
  sendResponse(reply, 200, vendor.toObject() as unknown as Record<string, unknown>, 'Vendor settings updated.');
}
