import mongoose, { type HydratedDocument } from 'mongoose';
import { Vendor } from '../../models/vendor';
import { Product } from '../../models/product';
import { Order } from '../../models/order';
import { User } from '../../models/user';
import { Category } from '../../models/category';
import { SubCategory } from '../../models/subCategory';
import type { ICategory, PopulatedOrder, ModelVendor } from '../../lib/types/constants';

export async function findUserVendorFields(
  userId: mongoose.Types.ObjectId
): Promise<{ vendorId?: mongoose.Types.ObjectId | null; accountStatus?: string } | null> {
  return User.findById(userId).select('vendorId accountStatus').lean();
}

export async function findVendorDocumentById(
  vendorId: mongoose.Types.ObjectId
): Promise<HydratedDocument<ModelVendor> | null> {
  return Vendor.findById(vendorId);
}

export async function countProductsForVendor(vendorId: mongoose.Types.ObjectId): Promise<number> {
  return Product.countDocuments({ vendor: vendorId });
}

export async function countPendingOrdersForVendor(
  vendorId: mongoose.Types.ObjectId,
  pendingStatuses: string[]
): Promise<number> {
  return Order.countDocuments({
    vendor: vendorId,
    status: { $in: pendingStatuses },
  });
}

export async function aggregatePaidRevenueForVendor(
  vendorId: mongoose.Types.ObjectId
): Promise<number> {
  const revenueResult = await Order.aggregate<{ total: number }>([
    { $match: { vendor: vendorId, paymentStatus: 'paid' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);

  return revenueResult[0]?.total ?? 0;
}

export async function listVendorProducts(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}) {
  return Product.find(options.filter)
    .sort(options.sort)
    .skip(options.skip)
    .limit(options.limit)
    .lean();
}

export async function countVendorProducts(filter: Record<string, unknown>): Promise<number> {
  return Product.countDocuments(filter);
}

export async function findCategoryById(
  categoryId: mongoose.Types.ObjectId
): Promise<ICategory | null> {
  return Category.findById(categoryId).lean<ICategory | null>();
}

export async function findSubCategoryById(
  subCategoryId: mongoose.Types.ObjectId
): Promise<{ _id: mongoose.Types.ObjectId; category: mongoose.Types.ObjectId } | null> {
  return SubCategory.findById(subCategoryId)
    .select('_id category')
    .lean<{ _id: mongoose.Types.ObjectId; category: mongoose.Types.ObjectId } | null>();
}

export async function findProductByVendorAndSlug(
  vendorId: mongoose.Types.ObjectId,
  slug: string
): Promise<{ _id: unknown } | null> {
  return Product.findOne({ vendor: vendorId, slug }).select('_id').lean();
}

export async function createProductRecord(data: Record<string, unknown>) {
  return Product.create(data);
}

export async function findProductPopulatedById(productId: mongoose.Types.ObjectId) {
  return Product.findById(productId)
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug category')
    .lean();
}

export async function findProductDocumentForVendor(
  productId: mongoose.Types.ObjectId,
  vendorId: mongoose.Types.ObjectId
) {
  return Product.findOne({ _id: productId, vendor: vendorId });
}

export async function listVendorOrders(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}): Promise<PopulatedOrder[]> {
  return Order.find(options.filter)
    .sort(options.sort)
    .skip(options.skip)
    .limit(options.limit)
    .populate('vendor', 'name storeName slug')
    .populate('items.product', 'name slug images')
    .lean<PopulatedOrder[]>();
}

export async function countVendorOrders(filter: Record<string, unknown>): Promise<number> {
  return Order.countDocuments(filter);
}

export async function updateVendorOrderStatus(options: {
  orderId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  status: string;
}): Promise<PopulatedOrder | null> {
  return Order.findOneAndUpdate(
    { _id: options.orderId, vendor: options.vendorId },
    { $set: { status: options.status } },
    { new: true }
  )
    .populate('vendor', 'name storeName slug')
    .populate('items.product', 'name slug price images')
    .lean<PopulatedOrder | null>();
}
