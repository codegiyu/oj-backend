/* Mongoose lean docs are typed loosely; match artist.service eslint baseline. */

import mongoose from 'mongoose';
import { Vendor } from '../models/vendor';
import { addJobToQueue } from '../queues/main.queue';
import type { ModelProduct } from '../lib/types/constants';
import { AppError } from '../utils/AppError';
import { mapPopulatedOrderToApi } from '../utils/mapPopulatedOrder';
import {
  generateUniqueSlug,
  parsePositiveInteger,
  parseSearch,
  parseString,
  normalizeSort,
} from '../utils/helpers';
import { shapeMarketplaceProductRow } from '../utils/marketplaceProductShape';
import { serializeDocIds } from '../controllers/artist/artist.helpers';
import { findVariantBySku } from '../utils/marketplaceProduct';
import { setBooleanInventoryAfterOrder } from '../utils/marketplaceInventory';
import * as marketplaceRepo from '../repositories/marketplace/marketplace.repository';
import { buildMarketplaceWhatsappLink } from '../utils/marketplaceWhatsappMessage';
import { loadRelatedProductsForProduct } from './relatedProductsLoader.service';

const PRODUCT_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'price', 'displayOrder'];
const ORDER_SORT_FIELDS = ['createdAt', 'updatedAt', 'orderNumber', 'totalAmount', 'status'];

function buildCustomerOrderConfirmationMessage(
  orderNumber: string,
  customerName: string,
  totalAmount: number
): string {
  return [
    `Hi ${customerName},`,
    '',
    `Thank you for your marketplace order (${orderNumber}).`,
    `Order total: ${totalAmount}`,
    '',
    'Your order status is pending. The vendor will contact you to arrange offline payment.',
    'If WhatsApp opened after checkout, you can also message the vendor directly.',
  ].join('\n');
}

export async function loadCategories(includeInactive: boolean) {
  const filter: Record<string, unknown> = {};
  if (!includeInactive) {
    filter.isActive = true;
  }

  const categories = await marketplaceRepo.findCategories(filter);

  return { categories };
}

export async function loadSubCategories(rawCategory?: string) {
  let categoryIdFilter: mongoose.Types.ObjectId | undefined;

  if (rawCategory) {
    if (mongoose.Types.ObjectId.isValid(rawCategory)) {
      categoryIdFilter = new mongoose.Types.ObjectId(rawCategory);
    } else {
      const category = await marketplaceRepo.findCategoryIdBySlug(rawCategory);
      if (!category) {
        return { subcategories: [] };
      }
      categoryIdFilter = category._id;
    }
  }

  const filter: Record<string, unknown> = { isActive: true };
  if (categoryIdFilter) {
    filter.category = categoryIdFilter;
  }

  const subcategories = await marketplaceRepo.findSubCategories(filter);

  return { subcategories };
}

export async function listMarketplaceVendors(query: {
  page?: string;
  limit?: string;
  search?: string;
  q?: string;
  featured?: string;
}) {
  const limit = parsePositiveInteger(query.limit, 20, 50);
  const page = parsePositiveInteger(query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(query.search ?? query.q);
  const featuredOnly = query.featured === 'true';

  const filter: Record<string, unknown> = { status: 'active' };
  if (featuredOnly) {
    filter.isFeatured = true;
  }
  if (search) {
    filter.$or = [
      { storeName: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const sort = featuredOnly
    ? ({ updatedAt: -1, storeName: 1 } as Record<string, 1 | -1>)
    : ({ storeName: 1, name: 1 } as Record<string, 1 | -1>);

  const [vendors, total] = await Promise.all([
    marketplaceRepo.listActiveVendors({ filter, skip, limit, sort }),
    marketplaceRepo.countVendors(filter),
  ]);

  const list = await Promise.all(
    vendors.map(async v => {
      const productCount = await marketplaceRepo.countPublishedProductsForVendor(v._id);
      return { ...v, productCount };
    })
  );

  return {
    vendors: list,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

export async function loadVendorBySlug(slug: string) {
  const vendor = await marketplaceRepo.findActiveVendorBySlug(slug);
  if (!vendor) throw new AppError('Vendor not found', 404);

  if (vendor.user) {
    const owner = await marketplaceRepo.findUserAccountStatus(vendor.user);
    if (owner?.accountStatus === 'suspended') {
      throw new AppError('Vendor not found', 404);
    }
  }

  const productCount = await marketplaceRepo.countPublishedProductsForVendor(vendor._id);

  return { ...vendor, productCount } as Record<string, unknown>;
}

export async function listMarketplaceProducts(query: {
  category?: string;
  subCategory?: string;
  vendor?: string;
  featured?: string;
  limit?: string;
  page?: string;
  search?: string;
  q?: string;
  sort?: string;
}) {
  const categorySlugOrId = query.category;
  const subCategorySlugOrId = query.subCategory;
  const vendorSlugOrId = query.vendor;
  const featured = query.featured === 'true';
  const limit = parsePositiveInteger(query.limit, 20, 50);
  const page = parsePositiveInteger(query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(query.search ?? query.q);
  const sortParam = query.sort;
  let sortStr: string;
  if (sortParam === 'recent') {
    sortStr = '-createdAt';
  } else if (sortParam === 'price-asc') {
    sortStr = 'price';
  } else if (sortParam === 'price-desc') {
    sortStr = '-price';
  } else if (sortParam === 'hot') {
    sortStr = '-displayOrder -createdAt';
  } else {
    sortStr = normalizeSort(sortParam, PRODUCT_SORT_FIELDS, 'displayOrder -createdAt');
  }

  const filter: Record<string, unknown> = { status: 'published' };

  let categoryId: mongoose.Types.ObjectId | undefined;
  let subCategoryId: mongoose.Types.ObjectId | undefined;

  if (categorySlugOrId) {
    if (mongoose.Types.ObjectId.isValid(categorySlugOrId)) {
      categoryId = new mongoose.Types.ObjectId(categorySlugOrId);
    } else {
      const category = await marketplaceRepo.findCategoryIdBySlug(categorySlugOrId);
      if (category) categoryId = category._id;
    }
  }

  if (subCategorySlugOrId) {
    if (mongoose.Types.ObjectId.isValid(subCategorySlugOrId)) {
      subCategoryId = new mongoose.Types.ObjectId(subCategorySlugOrId);
    } else {
      const sub = await marketplaceRepo.findSubCategoryBySlug(subCategorySlugOrId);
      if (sub) {
        subCategoryId = sub._id;
        if (!categoryId) {
          categoryId = sub.category;
        }
      }
    }
  }

  if (categoryId) {
    filter.category = categoryId;
  }
  if (subCategoryId) {
    filter.subCategory = subCategoryId;
  }
  if (featured) filter.isFeatured = true;

  if (vendorSlugOrId) {
    let vendorId: mongoose.Types.ObjectId | undefined;

    if (mongoose.Types.ObjectId.isValid(vendorSlugOrId)) {
      vendorId = new mongoose.Types.ObjectId(vendorSlugOrId);
    } else {
      const vendor = await marketplaceRepo.findVendorIdBySlugActive(vendorSlugOrId);

      if (!vendor) {
        return {
          products: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 1,
          },
        };
      }

      vendorId = vendor._id;
    }

    filter.vendor = vendorId;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const [products, total] = await Promise.all([
    marketplaceRepo.listPublishedProducts({ filter, sort: sortStr, skip, limit }),
    marketplaceRepo.countPublishedProducts(filter),
  ]);

  const list = products.map(p =>
    shapeMarketplaceProductRow(p as unknown as Record<string, unknown>)
  );

  return {
    products: list,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

export async function loadProductBySlug(slug: string) {
  const product = await marketplaceRepo.findPublishedProductBySlug(slug);
  if (!product) throw new AppError('Product not found', 404);

  const shaped = shapeMarketplaceProductRow(product as unknown as Record<string, unknown>);
  const relatedProducts = await loadRelatedProductsForProduct(shaped);

  return { product: shaped, relatedProducts };
}

export async function becomeVendor(
  userId: string,
  body: {
    storeName: string;
    storeDescription?: string;
    email: string;
    phone: string;
    whatsapp?: string;
    address?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankName?: string;
  }
): Promise<{ statusCode: 200 | 201; data: Record<string, unknown>; message: string }> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user id', 400);
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const storeName = typeof body.storeName === 'string' ? body.storeName.trim() : '';
  if (!storeName) {
    throw new AppError('Store name is required', 400);
  }

  const user = await marketplaceRepo.findUserForVendorLink(userObjectId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.vendorId) {
    throw new AppError('You already have a vendor profile', 409);
  }

  const linkedVendor = await marketplaceRepo.findVendorByUser(userObjectId);
  if (linkedVendor) {
    await marketplaceRepo.updateUserVendorId(userObjectId, linkedVendor._id);
    const serialized = serializeDocIds(linkedVendor as unknown as Record<string, unknown>);
    return {
      statusCode: 200,
      data: { vendor: serialized },
      message: 'Vendor profile linked.',
    };
  }

  const slug = await generateUniqueSlug(Vendor, storeName);

  const vendorDoc = await marketplaceRepo.createVendorRecord({
    user: userObjectId,
    name: storeName,
    slug,
    email: body.email.toLowerCase(),
    phone: body.phone,
    storeName,
    storeDescription: body.storeDescription ?? '',
    whatsapp: body.whatsapp ?? '',
    address: body.address ?? '',
    bankAccountName: body.bankAccountName ?? '',
    bankAccountNumber: body.bankAccountNumber ?? '',
    bankName: body.bankName ?? '',
    status: 'pending',
    isVerified: false,
  });

  const linked = await marketplaceRepo.linkUserVendorIdIfUnset(userObjectId, vendorDoc._id);

  if (!linked) {
    await marketplaceRepo.deleteVendorById(vendorDoc._id);
    throw new AppError('You already have a vendor profile', 409);
  }

  const serialized = serializeDocIds(vendorDoc.toObject() as unknown as Record<string, unknown>);

  return {
    statusCode: 201,
    data: { vendor: serialized },
    message: 'Application received.',
  };
}

export async function placeMarketplaceOrder(
  body: {
    customer: { name: string; email: string; phone: string; address?: string };
    notes?: string;
    items: Array<{
      productId: string;
      productName?: string;
      quantity: number;
      price: number;
      sku?: string;
    }>;
  },
  authUser?: { scope: string; userId: string } | null
) {
  const { customer, items, notes } = body;
  if (!items.length) throw new AppError('At least one item is required', 400);

  const productIds = items.map(i => i.productId);
  const products = await marketplaceRepo.findPublishedProductsByIds(
    productIds.map(id => new mongoose.Types.ObjectId(id))
  );

  const productMap = new Map<string, ModelProduct>();
  for (const p of products) {
    productMap.set(p._id.toString(), p);
  }

  const itemsByVendor = new Map<
    string,
    {
      vendorId: mongoose.Types.ObjectId;
      items: {
        product: mongoose.Types.ObjectId;
        productName?: string;
        quantity: number;
        price: number;
        totalPrice: number;
        sku?: string;
        selectedOptions?: Record<string, string>;
      }[];
      totalAmount: number;
    }
  >();

  for (const item of items) {
    const prod = productMap.get(item.productId);
    if (!prod) throw new AppError(`Product not found: ${item.productId}`, 400);
    const vendorId = (prod as { vendor: mongoose.Types.ObjectId }).vendor;

    let bucket = itemsByVendor.get(vendorId.toString());
    if (!bucket) {
      bucket = { vendorId, items: [], totalAmount: 0 };
      itemsByVendor.set(vendorId.toString(), bucket);
    }

    if (prod.variants?.length) {
      if (!item.sku || String(item.sku).trim() === '') {
        throw new AppError(
          `Product ${item.productId} has variants; sku is required for each item.`,
          400
        );
      }
      const variant = findVariantBySku(prod, item.sku);
      if (!variant) {
        throw new AppError(
          `No variant with sku "${item.sku}" found for product ${item.productId}.`,
          400
        );
      }
      if (item.price !== variant.price) {
        throw new AppError(
          `Price for variant ${item.sku} does not match product ${item.productId}. Expected ${variant.price}, got ${item.price}.`,
          400
        );
      }
      if (!variant.inStock) {
        throw new AppError(
          `Variant ${item.sku} for product ${item.productId} is not in stock.`,
          400
        );
      }
      const itemTotal = item.price * item.quantity;
      bucket.totalAmount += itemTotal;
      bucket.items.push({
        product: new mongoose.Types.ObjectId(item.productId),
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        totalPrice: itemTotal,
        sku: variant.sku,
        selectedOptions: variant.options,
      });
    } else {
      const dbPrice = Number(prod.price);
      if (item.price !== dbPrice) {
        throw new AppError(
          `Price for product ${item.productId} does not match. Expected ${dbPrice}, got ${item.price}.`,
          400
        );
      }
      if (prod.inStock === false) {
        throw new AppError(`Product ${item.productId} is not in stock.`, 400);
      }

      const itemTotal = item.price * item.quantity;
      bucket.totalAmount += itemTotal;
      bucket.items.push({
        product: new mongoose.Types.ObjectId(item.productId),
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        totalPrice: itemTotal,
      });
    }
  }

  if (itemsByVendor.size === 0) throw new AppError('Invalid items', 400);

  const createdOrders: Array<Record<string, unknown>> = [];

  for (const { vendorId, items: vendorItems, totalAmount } of itemsByVendor.values()) {
    const orderNumber =
      'ORD-' +
      new Date().toISOString().slice(0, 10).replace(/-/g, '') +
      '-' +
      Math.random().toString(36).slice(2, 8).toUpperCase();

    const order = await marketplaceRepo.createOrderRecord({
      orderNumber,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address ?? '',
      },
      customerId:
        authUser?.scope === 'client-access'
          ? new mongoose.Types.ObjectId(authUser.userId)
          : undefined,
      vendor: vendorId,
      items: vendorItems,
      totalAmount,
      notes: notes?.trim() ? notes.trim() : '',
      status: 'pending',
      paymentStatus: 'pending',
    });

    await setBooleanInventoryAfterOrder(vendorItems);

    const created = await marketplaceRepo.findOrderPopulatedById(order._id);

    if (!created) {
      continue;
    }

    const { message, link } = buildMarketplaceWhatsappLink(created);
    const v = created?.vendor as
      | { email?: string; whatsapp?: string }
      | mongoose.Types.ObjectId
      | null
      | undefined;
    const vendorEmail =
      v && typeof v === 'object' && !(v instanceof mongoose.Types.ObjectId) && v.email
        ? String(v.email).trim()
        : '';

    if (vendorEmail && vendorEmail.includes('@')) {
      try {
        await addJobToQueue({
          type: 'notificationEmail',
          to: vendorEmail,
          userModel: 'User',
          title: 'New marketplace order',
          message,
        });
      } catch {
        // ignore notification errors
      }
    }

    const customerEmail = String(customer.email ?? '').trim();
    if (customerEmail.includes('@')) {
      try {
        await addJobToQueue({
          type: 'notificationEmail',
          to: customerEmail,
          userModel: 'User',
          title: 'Your marketplace order confirmation',
          message: buildCustomerOrderConfirmationMessage(orderNumber, customer.name, totalAmount),
        });
      } catch {
        // ignore notification errors
      }
    }

    const shaped = mapPopulatedOrderToApi(created);
    createdOrders.push({
      ...shaped,
      whatsappLink: link,
    });
  }

  if (createdOrders.length === 1) {
    return { single: true as const, order: createdOrders[0] };
  }

  return { single: false as const, orders: createdOrders };
}

export async function listMyMarketplaceOrders(
  userId: string,
  query: {
    page?: string;
    limit?: string;
    status?: string;
    search?: string;
    sort?: string;
  }
) {
  const limit = parsePositiveInteger(query.limit, 20, 100);
  const page = parsePositiveInteger(query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(query.search);
  const status = parseString(query.status);
  const sortStr = normalizeSort(query.sort, ORDER_SORT_FIELDS, '-createdAt');

  const filter: Record<string, unknown> = {
    customerId: new mongoose.Types.ObjectId(userId),
  };
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
    marketplaceRepo.listCustomerOrders({ filter, sort: sortStr, skip, limit }),
    marketplaceRepo.countCustomerOrders(filter),
  ]);

  const list = orders.map(o => {
    const shaped = mapPopulatedOrderToApi(o);
    const { link } = buildMarketplaceWhatsappLink(o);

    return {
      ...shaped,
      whatsappLink: link ?? null,
    };
  });

  return {
    orders: list,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

export async function loadOrderWhatsappLink(userId: string, orderId: string) {
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError('Invalid orderId', 400);
  }

  const order = await marketplaceRepo.findCustomerOrderById({
    orderId: new mongoose.Types.ObjectId(orderId),
    customerId: new mongoose.Types.ObjectId(userId),
  });

  if (!order) throw new AppError('Order not found', 404);

  const shaped = mapPopulatedOrderToApi(order);
  const { message, link } = buildMarketplaceWhatsappLink({
    ...order,
    ...shaped,
  });

  if (!link) {
    return { whatsappLink: null, message, hasLink: false as const };
  }

  return { whatsappLink: link, message, hasLink: true as const };
}
