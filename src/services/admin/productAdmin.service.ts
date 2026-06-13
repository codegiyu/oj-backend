import mongoose from 'mongoose';
import { Product } from '../../models/product';
import { Vendor } from '../../models/vendor';
import { Category } from '../../models/category';
import { SubCategory } from '../../models/subCategory';
import { AppError } from '../../utils/AppError';
import { generateVendorProductSlug } from '../../utils/helpers';
import { parseObjectId } from '../../controllers/admin/admin.helpers';
import { schedulePublishedContentRevalidation } from '../frontendRevalidation.service';

export type CreateAdminProductInput = {
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

export async function createAdminProductRecord(body: CreateAdminProductInput) {
  if (!body?.name?.trim()) throw new AppError('Name is required', 400);
  if (body?.price == null || typeof body.price !== 'number' || body.price < 0) {
    throw new AppError('Valid price is required', 400);
  }
  if (!body?.vendorId) throw new AppError('Vendor is required', 400);

  const vendorId = parseObjectId(body.vendorId, 'vendorId');
  const vendor = await Vendor.findById(vendorId).lean();
  if (!vendor) throw new AppError('Vendor not found', 404);

  let categoryId: mongoose.Types.ObjectId | null = null;
  let subCategoryId: mongoose.Types.ObjectId | null = null;

  if (body.category && mongoose.Types.ObjectId.isValid(body.category)) {
    const cat = await Category.findById(body.category).select('_id').lean();
    if (cat) categoryId = cat._id;
  }

  if (body.subCategory && mongoose.Types.ObjectId.isValid(body.subCategory)) {
    const sub = await SubCategory.findById(body.subCategory).select('_id').lean();
    if (sub) subCategoryId = sub._id;
  }

  const slug = await generateVendorProductSlug(Product, vendorId, body.name.trim(), vendor.slug);

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

  const populated = await Product.findById(product._id)
    .populate('vendor', 'name slug storeName')
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug')
    .lean();

  if ((body.status ?? 'draft') === 'published') {
    schedulePublishedContentRevalidation('marketplace_product', product.slug);
  }

  return populated ?? product;
}
