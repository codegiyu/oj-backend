import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Product } from '../../models/product';
import { Vendor } from '../../models/vendor';
import { Category } from '../../models/category';
import { SubCategory } from '../../models/subCategory';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateVendorProductSlug, parsePositiveInteger, parseSearch, parseString, normalizeSort } from '../../utils/helpers';
import { requireAdmin, parseObjectId } from './admin.helpers';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'price', 'displayOrder', 'status'];

function shapeProductItem(raw: Record<string, unknown>): Record<string, unknown> {
  const vendor = raw.vendor;
  const category = raw.category;
  const subCategory = raw.subCategory;
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    name: raw.name,
    slug: raw.slug,
    vendor: vendor != null ? String(vendor) : vendor,
    vendorName: (vendor as Record<string, unknown>)?.storeName ?? (vendor as Record<string, unknown>)?.name,
    vendorSlug: (vendor as Record<string, unknown>)?.slug,
    description: raw.description,
    category: category,
    subCategory: subCategory,
    tags: raw.tags,
    price: raw.price,
    images: raw.images ?? [],
    inStock: raw.inStock,
    status: raw.status,
    isFeatured: raw.isFeatured,
    displayOrder: raw.displayOrder ?? 0,
    variationOptions: raw.variationOptions,
    variants: raw.variants,
    rejectionReason: raw.rejectionReason,
    rejectedAt: raw.rejectedAt,
    approvedAt: raw.approvedAt,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

export async function listAdminProducts(
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string; search?: string; status?: string; vendor?: string; sort?: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const limit = parsePositiveInteger(request.query.limit, 25, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  const search = parseSearch(request.query.search);
  const status = parseString(request.query.status);
  const vendorId = parseString(request.query.vendor);
  if (status) filter.status = status;
  if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
    filter.vendor = new mongoose.Types.ObjectId(vendorId);
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, '-createdAt');

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sortStr).populate('vendor', 'name slug storeName').populate('category', 'name slug').populate('subCategory', 'name slug').skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  const products = (items as Record<string, unknown>[]).map(shapeProductItem);

  sendResponse(reply, 200, {
    products,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  }, 'Products list loaded.');
}

export async function getAdminProduct(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const doc = await Product.findById(id).populate('vendor', 'name slug storeName').populate('category', 'name slug').populate('subCategory', 'name slug').lean();
  if (!doc) throw new AppError('Product not found', 404);
  sendResponse(reply, 200, { product: shapeProductItem(doc as unknown as Record<string, unknown>) }, 'Product loaded.');
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
      variants?: Array<{ options: Record<string, string>; price: number; inStock: boolean; isDefault?: boolean; sku?: string; image?: string }>;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const body = request.body;
  if (!body?.name?.trim()) throw new AppError('Name is required', 400);
  if (body?.price == null || typeof body.price !== 'number' || body.price < 0) throw new AppError('Valid price is required', 400);
  if (!body?.vendorId) throw new AppError('Vendor is required', 400);

  const vendorId = parseObjectId(body.vendorId, 'vendorId');
  const vendor = await Vendor.findById(vendorId).lean();
  if (!vendor) throw new AppError('Vendor not found', 404);

  let categoryId: mongoose.Types.ObjectId | null = null;
  let subCategoryId: mongoose.Types.ObjectId | null = null;
  if (body.category && mongoose.Types.ObjectId.isValid(body.category)) {
    const cat = await Category.findById(body.category).select('_id').lean();
    if (cat) categoryId = cat._id as mongoose.Types.ObjectId;
  }
  if (body.subCategory && mongoose.Types.ObjectId.isValid(body.subCategory)) {
    const sub = await SubCategory.findById(body.subCategory).select('_id').lean();
    if (sub) subCategoryId = sub._id as mongoose.Types.ObjectId;
  }

  const slug = await generateVendorProductSlug(Product, vendorId, body.name.trim());

  const product = await Product.create({
    name: body.name.trim(),
    slug,
    vendor: vendorId,
    description: body.description ?? '',
    category: categoryId,
    subCategory: subCategoryId,
    tags: body.tags ?? [],
    price: body.price,
    images: body.images ?? [],
    inStock: body.inStock ?? true,
    status: body.status ?? 'draft',
    isFeatured: body.isFeatured ?? false,
    displayOrder: 0,
    variationOptions: body.variationOptions,
    variants: body.variants,
  });

  const populated = await Product.findById(product._id).populate('vendor', 'name slug storeName').populate('category', 'name slug').populate('subCategory', 'name slug').lean();
  sendResponse(reply, 201, { product: shapeProductItem((populated ?? product) as unknown as Record<string, unknown>) }, 'Product created.');
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
      variants?: Array<{ options: Record<string, string>; price: number; inStock: boolean; isDefault?: boolean; sku?: string; image?: string }>;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
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
  if (body.variationOptions !== undefined) product.variationOptions = body.variationOptions as never;
  if (body.variants !== undefined) product.variants = body.variants as never;

  if (body.category !== undefined) {
    product.category = body.category && mongoose.Types.ObjectId.isValid(body.category)
      ? new mongoose.Types.ObjectId(body.category) as never
      : null;
  }
  if (body.subCategory !== undefined) {
    product.subCategory = body.subCategory && mongoose.Types.ObjectId.isValid(body.subCategory)
      ? new mongoose.Types.ObjectId(body.subCategory) as never
      : null;
  }

  await product.save();

  const populated = await Product.findById(product._id).populate('vendor', 'name slug storeName').populate('category', 'name slug').populate('subCategory', 'name slug').lean();
  sendResponse(reply, 200, { product: shapeProductItem((populated ?? product.toObject()) as Record<string, unknown>) }, 'Product updated.');
}

export async function deleteAdminProduct(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const result = await Product.findByIdAndDelete(id);
  if (!result) throw new AppError('Product not found', 404);
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

  const populated = await Product.findById(product._id).populate('vendor', 'name slug storeName').populate('category', 'name slug').populate('subCategory', 'name slug').lean();
  sendResponse(reply, 200, { product: shapeProductItem((populated ?? product.toObject()) as Record<string, unknown>) }, 'Product approved.');
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

  const populated = await Product.findById(product._id).populate('vendor', 'name slug storeName').populate('category', 'name slug').populate('subCategory', 'name slug').lean();
  sendResponse(reply, 200, { product: shapeProductItem((populated ?? product.toObject()) as Record<string, unknown>) }, 'Product rejected.');
}
