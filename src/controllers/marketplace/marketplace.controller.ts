import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Vendor } from '../../models/vendor';
import { User } from '../../models/user';
import { addJobToQueue } from '../../queues/main.queue';
import { Product } from '../../models/product';
import { Order } from '../../models/order';
import { Category } from '../../models/category';
import { SubCategory } from '../../models/subCategory';
import { ModelProduct, PopulatedOrder, IVendor, IUser } from '../../lib/types/constants';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { getAuthUser } from '../../utils/getAuthUser';
import { mapPopulatedOrderToApi } from '../../utils/mapPopulatedOrder';
import {
  generateUniqueSlug,
  parsePositiveInteger,
  parseSearch,
  parseString,
  normalizeSort,
} from '../../utils/helpers';
import { shapeMarketplaceProductRow } from '../../utils/marketplaceProductShape';
import { serializeDocIds } from '../artist/artist.helpers';
import { findVariantBySku } from '../../utils/marketplaceProduct';

function buildWhatsappMessage(order: PopulatedOrder): { message: string; link?: string } {
  const customer = order.customer;
  const items = order.items ?? [];
  const vendor = order.vendor as { whatsapp?: string } | undefined;

  const lines: string[] = [];
  lines.push(`New order ${order.orderNumber ?? ''}`);
  if (customer?.name) lines.push(`Customer: ${customer.name}`);
  if (customer?.phone) lines.push(`Phone: ${customer.phone}`);
  if (customer?.email) lines.push(`Email: ${customer.email}`);
  if (customer?.address) lines.push(`Address: ${customer.address}`);
  lines.push('');
  lines.push('Items:');

  let total = 0;
  for (const item of items) {
    const name = (item.productName as string) ?? '';
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const lineTotal = Number(item.totalPrice) || qty * price;
    total += lineTotal;
    lines.push(`- ${name} x${qty} @ ${price} = ${lineTotal}`);
  }

  lines.push('');
  lines.push(`Total: ${order.totalAmount ?? total}`);

  const message = lines.join('\n');

  if (!vendor?.whatsapp) {
    return { message };
  }

  const digits = String(vendor.whatsapp).replace(/[^\d+]/g, '');
  const encoded = encodeURIComponent(message);
  const link = `https://wa.me/${digits}?text=${encoded}`;

  return { message, link };
}

async function getActiveCategories(includeInactive: boolean | undefined) {
  const filter: Record<string, unknown> = {};
  if (!includeInactive) {
    filter.isActive = true;
  }
  return Category.find(filter)
    .sort({ displayOrder: 1, name: 1 })
    .select('_id name slug displayOrder isActive')
    .lean();
}

export async function getCategories(
  request: FastifyRequest<{ Querystring: { includeInactive?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const includeInactive = request.query.includeInactive === '1';
  const categories = await getActiveCategories(includeInactive);
  sendResponse(reply, 200, { categories }, 'Categories loaded.');
}

export async function getSubCategories(
  request: FastifyRequest<{ Querystring: { category?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const rawCategory = request.query.category;

  let categoryIdFilter: mongoose.Types.ObjectId | undefined;

  if (rawCategory) {
    if (mongoose.Types.ObjectId.isValid(rawCategory)) {
      categoryIdFilter = new mongoose.Types.ObjectId(rawCategory);
    } else {
      const category = await Category.findOne({ slug: rawCategory })
        .select('_id')
        .lean<{ _id: mongoose.Types.ObjectId } | null>();
      if (!category) {
        // If a specific category identifier is provided but not found, return empty list
        sendResponse(reply, 200, { subcategories: [] }, 'Subcategories loaded.');
        return;
      }
      categoryIdFilter = category._id;
    }
  }

  const filter: Record<string, unknown> = { isActive: true };
  if (categoryIdFilter) {
    filter.category = categoryIdFilter;
  }

  const subcategories = await SubCategory.find(filter)
    .sort({ displayOrder: 1, name: 1 })
    .select('_id category name slug displayOrder isActive')
    .lean();

  sendResponse(reply, 200, { subcategories }, 'Subcategories loaded.');
}

export async function getVendors(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      q?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const limit = parsePositiveInteger(request.query.limit, 20, 50);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(request.query.search ?? request.query.q);

  const filter: Record<string, unknown> = { status: 'active' };
  if (search) {
    filter.$or = [
      { storeName: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const [vendors, total] = await Promise.all([
    Vendor.find(filter).sort({ storeName: 1, name: 1 }).skip(skip).limit(limit).lean(),
    Vendor.countDocuments(filter),
  ]);

  const list = await Promise.all(
    vendors.map(async v => {
      const productCount = await Product.countDocuments({
        vendor: v._id,
        status: 'published',
      });
      return { ...v, productCount };
    })
  );

  sendResponse(
    reply,
    200,
    {
      vendors: list,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    },
    'Vendors loaded.'
  );
}

export async function getVendorBySlug(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const vendor = await Vendor.findOne({ slug: request.params.slug, status: 'active' }).lean();
  if (!vendor) throw new AppError('Vendor not found', 404);

  if (vendor.user) {
    const owner = await User.findById(vendor.user).select('accountStatus').lean();
    if (owner?.accountStatus === 'suspended') {
      throw new AppError('Vendor not found', 404);
    }
  }
  const productCount = await Product.countDocuments({
    vendor: vendor._id,
    status: 'published',
  });
  sendResponse(
    reply,
    200,
    { ...vendor, productCount } as unknown as Record<string, unknown>,
    'Vendor loaded.'
  );
}

const PRODUCT_SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'price', 'displayOrder'];

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
  const categorySlugOrId = request.query.category;
  const subCategorySlugOrId = request.query.subCategory;
  const vendorSlugOrId = request.query.vendor;
  const featured = request.query.featured === 'true';
  const limit = parsePositiveInteger(request.query.limit, 20, 50);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(request.query.search ?? request.query.q);
  const sortParam = request.query.sort;
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
      const category = await Category.findOne({ slug: categorySlugOrId })
        .select('_id')
        .lean<{ _id: mongoose.Types.ObjectId } | null>();
      if (category) categoryId = category._id;
    }
  }

  if (subCategorySlugOrId) {
    if (mongoose.Types.ObjectId.isValid(subCategorySlugOrId)) {
      subCategoryId = new mongoose.Types.ObjectId(subCategorySlugOrId);
    } else {
      const sub = await SubCategory.findOne({ slug: subCategorySlugOrId })
        .select('_id category')
        .lean<{ _id: mongoose.Types.ObjectId; category: mongoose.Types.ObjectId } | null>();
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
      const vendor = await Vendor.findOne({ slug: vendorSlugOrId, status: 'active' })
        .select('_id')
        .lean<{ _id: mongoose.Types.ObjectId } | null>();

      if (!vendor) {
        sendResponse(
          reply,
          200,
          {
            products: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 1,
            },
          },
          'Products loaded.'
        );
        return;
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
    Product.find(filter)
      .populate('vendor', 'storeName slug whatsapp')
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug category')
      .sort(sortStr)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  const list = products.map(p =>
    shapeMarketplaceProductRow(p as unknown as Record<string, unknown>)
  );

  sendResponse(
    reply,
    200,
    {
      products: list,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    },
    'Products loaded.'
  );
}

export async function getProductBySlug(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
): Promise<void> {
  const product = await Product.findOne({
    slug: request.params.slug,
    status: 'published',
  })
    .populate('vendor', 'storeName slug whatsapp')
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug category')
    .lean();
  if (!product) throw new AppError('Product not found', 404);

  sendResponse(
    reply,
    200,
    shapeMarketplaceProductRow(product as unknown as Record<string, unknown>),
    'Product loaded.'
  );
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
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  if (!mongoose.Types.ObjectId.isValid(auth.userId)) {
    throw new AppError('Invalid user id', 400);
  }

  const userId = new mongoose.Types.ObjectId(auth.userId);
  const body = request.body;
  const storeName = typeof body.storeName === 'string' ? body.storeName.trim() : '';
  if (!storeName) {
    throw new AppError('Store name is required', 400);
  }

  const user = await User.findById(userId)
    .select('vendorId')
    .lean<Pick<IUser, '_id' | 'vendorId'> | null>();
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.vendorId) {
    throw new AppError('You already have a vendor profile', 409);
  }

  const linkedVendor = await Vendor.findOne({ user: userId }).lean<IVendor | null>();
  if (linkedVendor) {
    await User.updateOne({ _id: userId }, { $set: { vendorId: linkedVendor._id } });
    const serialized = serializeDocIds(linkedVendor as unknown as Record<string, unknown>);
    sendResponse(reply, 200, { vendor: serialized }, 'Vendor profile linked.');
    return;
  }

  const slug = await generateUniqueSlug(Vendor, storeName);

  const vendorDoc = await Vendor.create({
    user: userId,
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

  const linked = await User.findOneAndUpdate(
    { _id: userId, vendorId: null },
    { $set: { vendorId: vendorDoc._id } },
    { new: true }
  );

  if (!linked) {
    await Vendor.deleteOne({ _id: vendorDoc._id });
    throw new AppError('You already have a vendor profile', 409);
  }

  const serialized = serializeDocIds(vendorDoc.toObject() as unknown as Record<string, unknown>);
  sendResponse(reply, 201, { vendor: serialized }, 'Application received.');
}

async function setBooleanInventoryAfterOrder(
  orderItems: Array<{ product: mongoose.Types.ObjectId; sku?: string }>
): Promise<void> {
  for (const { product: productId, sku } of orderItems) {
    const doc = await Product.findById(productId);
    if (!doc) continue;

    if (doc.variants?.length && sku) {
      const skuUpper = String(sku).toUpperCase();
      const idx = doc.variants.findIndex(v => (v.sku ?? '').toUpperCase() === skuUpper);
      if (idx < 0) continue;

      doc.variants[idx].inStock = false;
      await doc.save();
    } else if (!doc.variants?.length) {
      doc.inStock = false;
      await doc.save();
    }
  }
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
  const { customer, items, notes } = request.body;
  if (!items.length) throw new AppError('At least one item is required', 400);

  const productIds = items.map(i => i.productId);
  const products = await Product.find({
    _id: { $in: productIds.map(id => new mongoose.Types.ObjectId(id)) },
    status: 'published',
  })
    .populate('vendor', 'name storeName slug phone whatsapp email')
    .lean<ModelProduct[]>();

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

  const user = getAuthUser(request);
  const createdOrders: Array<Record<string, unknown>> = [];

  for (const { vendorId, items: vendorItems, totalAmount } of itemsByVendor.values()) {
    const orderNumber =
      'ORD-' +
      new Date().toISOString().slice(0, 10).replace(/-/g, '') +
      '-' +
      Math.random().toString(36).slice(2, 8).toUpperCase();

    const order = await Order.create({
      orderNumber,
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address ?? '',
      },
      customerId:
        user?.scope === 'client-access' ? new mongoose.Types.ObjectId(user.userId) : undefined,
      vendor: vendorId,
      items: vendorItems,
      totalAmount,
      notes: notes?.trim() ? notes.trim() : '',
      status: 'pending',
      paymentStatus: 'pending',
    });

    await setBooleanInventoryAfterOrder(vendorItems);

    const created = await Order.findById(order._id)
      .populate('vendor', 'name storeName slug phone whatsapp email')
      .populate('items.product', 'name slug images')
      .lean<PopulatedOrder | null>();

    if (!created) {
      continue;
    }

    const { message, link } = buildWhatsappMessage(created);
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

    const shaped = mapPopulatedOrderToApi(created);
    createdOrders.push({
      ...shaped,
      whatsappLink: link,
    });
  }

  if (createdOrders.length === 1) {
    sendResponse(reply, 201, { order: createdOrders[0] }, 'Order placed.');
  } else {
    sendResponse(reply, 201, { orders: createdOrders }, 'Orders placed.');
  }
}

const ORDER_SORT_FIELDS = ['createdAt', 'updatedAt', 'orderNumber', 'totalAmount', 'status'];

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
  const user = getAuthUser(request);
  if (!user || user.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const limit = parsePositiveInteger(request.query.limit, 20, 100);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(request.query.search);
  const status = parseString(request.query.status);
  const sortStr = normalizeSort(request.query.sort, ORDER_SORT_FIELDS, '-createdAt');

  const filter: Record<string, unknown> = {
    customerId: new mongoose.Types.ObjectId(user.userId),
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
    Order.find(filter)
      .populate('vendor', 'name storeName slug phone whatsapp')
      .populate('items.product', 'name slug price images')
      .sort(sortStr)
      .skip(skip)
      .limit(limit)
      .lean<PopulatedOrder[]>(),
    Order.countDocuments(filter),
  ]);

  const list = orders.map(o => {
    const shaped = mapPopulatedOrderToApi(o);
    const { link } = buildWhatsappMessage(o);

    return {
      ...shaped,
      whatsappLink: link ?? null,
    };
  });
  sendResponse(
    reply,
    200,
    {
      orders: list,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    },
    'Orders loaded.'
  );
}

export async function getOrderWhatsappLink(
  request: FastifyRequest<{ Params: { orderId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const { orderId } = request.params;
  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    throw new AppError('Invalid orderId', 400);
  }

  const order = await Order.findOne({
    _id: new mongoose.Types.ObjectId(orderId),
    customerId: new mongoose.Types.ObjectId(auth.userId),
  })
    .populate('vendor', 'name storeName slug phone whatsapp')
    .populate('items.product', 'name slug images')
    .lean<PopulatedOrder | null>();

  if (!order) throw new AppError('Order not found', 404);

  const shaped = mapPopulatedOrderToApi(order);
  const { message, link } = buildWhatsappMessage({
    ...order,
    ...shaped,
  });

  if (!link) {
    sendResponse(
      reply,
      200,
      { whatsappLink: null, message },
      'Vendor WhatsApp not configured for this order.'
    );
    return;
  }

  sendResponse(reply, 200, { whatsappLink: link, message }, 'WhatsApp link generated.');
}
