import mongoose, { type HydratedDocument } from 'mongoose';
import { Category } from '../../models/category';
import { SubCategory } from '../../models/subCategory';
import { Vendor } from '../../models/vendor';
import { User } from '../../models/user';
import { Product } from '../../models/product';
import { Order } from '../../models/order';
import type { IVendor, IUser, ModelProduct, PopulatedOrder } from '../../lib/types/constants';

export async function findCategories(filter: Record<string, unknown>) {
  return Category.find(filter)
    .sort({ displayOrder: 1, name: 1 })
    .select('_id name slug displayOrder isActive')
    .lean();
}

export async function findCategoryIdBySlug(
  slug: string
): Promise<{ _id: mongoose.Types.ObjectId } | null> {
  return Category.findOne({ slug }).select('_id').lean<{ _id: mongoose.Types.ObjectId } | null>();
}

export async function findSubCategories(filter: Record<string, unknown>) {
  return SubCategory.find(filter)
    .sort({ displayOrder: 1, name: 1 })
    .select('_id category name slug displayOrder isActive')
    .lean();
}

export async function findSubCategoryBySlug(
  slug: string
): Promise<{ _id: mongoose.Types.ObjectId; category: mongoose.Types.ObjectId } | null> {
  return SubCategory.findOne({ slug })
    .select('_id category')
    .lean<{ _id: mongoose.Types.ObjectId; category: mongoose.Types.ObjectId } | null>();
}

export async function listActiveVendors(options: {
  filter: Record<string, unknown>;
  skip: number;
  limit: number;
  sort?: Record<string, 1 | -1>;
}) {
  return Vendor.find(options.filter)
    .sort(options.sort ?? { storeName: 1, name: 1 })
    .skip(options.skip)
    .limit(options.limit)
    .lean();
}

export async function countVendors(filter: Record<string, unknown>): Promise<number> {
  return Vendor.countDocuments(filter);
}

export async function countPublishedProductsForVendor(
  vendorId: mongoose.Types.ObjectId
): Promise<number> {
  return Product.countDocuments({ vendor: vendorId, status: 'published' });
}

/** Single aggregation for vendor list pages — avoids N+1 countDocuments per vendor. */
export async function countPublishedProductsByVendorIds(
  vendorIds: mongoose.Types.ObjectId[]
): Promise<Map<string, number>> {
  if (vendorIds.length === 0) return new Map();

  const rows = await Product.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { vendor: { $in: vendorIds }, status: 'published' } },
    { $group: { _id: '$vendor', count: { $sum: 1 } } },
  ]);

  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(String(row._id), row.count);
  }

  return counts;
}

export async function findActiveVendorBySlug(slug: string) {
  return Vendor.findOne({ slug, status: 'active' }).lean();
}

export async function findUserAccountStatus(
  userId: mongoose.Types.ObjectId
): Promise<{ accountStatus?: string } | null> {
  return User.findById(userId).select('accountStatus').lean<{ accountStatus?: string } | null>();
}

export async function findVendorIdBySlugActive(
  slug: string
): Promise<{ _id: mongoose.Types.ObjectId } | null> {
  return Vendor.findOne({ slug, status: 'active' })
    .select('_id')
    .lean<{ _id: mongoose.Types.ObjectId } | null>();
}

export async function listPublishedProducts(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return Product.find(options.filter)
    .populate('vendor', 'storeName slug whatsapp')
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug category')
    .sort(options.sort)
    .skip(options.skip)
    .limit(options.limit)
    .lean();
}

export async function countPublishedProducts(filter: Record<string, unknown>): Promise<number> {
  return Product.countDocuments(filter);
}

export async function findPublishedProductBySlug(slug: string) {
  return Product.findOne({ slug, status: 'published' })
    .populate('vendor', 'storeName slug whatsapp')
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug category')
    .lean();
}

export async function findUserForVendorLink(
  userId: mongoose.Types.ObjectId
): Promise<Pick<IUser, '_id' | 'vendorId'> | null> {
  return User.findById(userId).select('vendorId').lean<Pick<IUser, '_id' | 'vendorId'> | null>();
}

export async function findVendorByUser(userId: mongoose.Types.ObjectId): Promise<IVendor | null> {
  return Vendor.findOne({ user: userId }).lean<IVendor | null>();
}

export async function createVendorRecord(
  data: Record<string, unknown>
): Promise<HydratedDocument<IVendor>> {
  return Vendor.create(data);
}

export async function linkUserVendorIdIfUnset(
  userId: mongoose.Types.ObjectId,
  vendorId: mongoose.Types.ObjectId
): Promise<IUser | null> {
  return User.findOneAndUpdate(
    { _id: userId, vendorId: null },
    { $set: { vendorId } },
    { new: true }
  );
}

export async function updateUserVendorId(
  userId: mongoose.Types.ObjectId,
  vendorId: mongoose.Types.ObjectId
): Promise<void> {
  await User.updateOne({ _id: userId }, { $set: { vendorId } });
}

export async function deleteVendorById(vendorId: mongoose.Types.ObjectId): Promise<void> {
  await Vendor.deleteOne({ _id: vendorId });
}

export async function findPublishedProductsByIds(
  productIds: mongoose.Types.ObjectId[]
): Promise<ModelProduct[]> {
  return Product.find({
    _id: { $in: productIds },
    status: 'published',
  })
    .populate('vendor', 'storeName slug whatsapp')
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug category')
    .lean<ModelProduct[]>();
}

export async function findPublishedProductsForRelatedScoring(options: {
  excludeProductId: mongoose.Types.ObjectId;
  categoryId?: mongoose.Types.ObjectId;
  subCategoryId?: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId;
  limit: number;
}) {
  const orFilters: Record<string, unknown>[] = [];

  if (options.categoryId) orFilters.push({ category: options.categoryId });
  if (options.subCategoryId) orFilters.push({ subCategory: options.subCategoryId });
  if (options.vendorId) orFilters.push({ vendor: options.vendorId });

  const filter: Record<string, unknown> = {
    status: 'published',
    _id: { $ne: options.excludeProductId },
  };

  if (orFilters.length > 0) {
    filter.$or = orFilters;
  }

  return Product.find(filter)
    .select('_id name slug price vendor category subCategory tags')
    .limit(options.limit)
    .lean();
}

export async function findProductDocumentById(
  productId: mongoose.Types.ObjectId
): Promise<HydratedDocument<ModelProduct> | null> {
  return Product.findById(productId);
}

export async function createOrderRecord(
  data: Record<string, unknown>,
  session?: mongoose.ClientSession
) {
  const [order] = await Order.create([data], session ? { session } : undefined);
  return order;
}

export async function findOrderPopulatedById(
  orderId: mongoose.Types.ObjectId
): Promise<PopulatedOrder | null> {
  return Order.findById(orderId)
    .populate('vendor', 'name storeName slug phone whatsapp email')
    .populate('items.product', 'name slug images')
    .lean<PopulatedOrder | null>();
}

export async function listCustomerOrders(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}): Promise<PopulatedOrder[]> {
  return Order.find(options.filter)
    .populate('vendor', 'name storeName slug phone whatsapp')
    .populate('items.product', 'name slug price images')
    .sort(options.sort)
    .skip(options.skip)
    .limit(options.limit)
    .lean<PopulatedOrder[]>();
}

export async function countCustomerOrders(filter: Record<string, unknown>): Promise<number> {
  return Order.countDocuments(filter);
}

export async function findCustomerOrderById(options: {
  orderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
}): Promise<PopulatedOrder | null> {
  return Order.findOne({
    _id: options.orderId,
    customerId: options.customerId,
  })
    .populate('vendor', 'name storeName slug phone whatsapp')
    .populate('items.product', 'name slug images')
    .lean<PopulatedOrder | null>();
}
