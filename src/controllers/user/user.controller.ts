import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { User, unselectedFields as userUnselected } from '../../models/user';
import { Product } from '../../models/product';
import { Wishlist } from '../../models/wishlist';
import { Cart } from '../../models/cart';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { getAuthUser } from '../../utils/getAuthUser';
import { parseSearch, normalizeSort, parsePositiveInteger } from '../../utils/helpers';
import { buildClientUserPayload } from '../auth/auth.helpers';
import { serializePopulatedUser, shapeWishlistItem } from './dashboard.helpers';

export async function getMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const user = await User.findById(auth.userId)
    .select(userUnselected.join(' '))
    .lean();
  if (!user || user.accountStatus === 'deleted') {
    throw new AppError('User not found', 404);
  }

  const payload = await buildClientUserPayload(user);
  const serialized = serializePopulatedUser(payload as Record<string, unknown>);
  sendResponse(reply, 200, { user: serialized }, 'User loaded.');
}

export async function updateMe(
  request: FastifyRequest<{
    Body: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string; avatar?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const updates: Record<string, unknown> = {};
  const body = request.body ?? {};
  if (body.firstName !== undefined) updates.firstName = body.firstName;
  if (body.lastName !== undefined) updates.lastName = body.lastName;
  if (body.phoneNumber !== undefined) updates.phoneNumber = body.phoneNumber;
  if (body.avatar !== undefined) updates.avatar = body.avatar;
  // Email may be sent by frontend; backend can treat as read-only or require separate verification flow
  if (body.email !== undefined) updates.email = body.email;

  const user = await User.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(auth.userId), accountStatus: { $ne: 'deleted' } },
    { $set: updates },
    { returnDocument: 'after' }
  )
    .select(userUnselected.join(' '))
    .lean();
  if (!user) throw new AppError('User not found', 404);

  const payload = await buildClientUserPayload(user);
  const serialized = serializePopulatedUser(payload as Record<string, unknown>);
  sendResponse(reply, 200, { user: serialized }, 'User updated.');
}

const WISHLIST_SORT_FIELDS = ['createdAt'];

export async function listWishlist(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const userId = new mongoose.Types.ObjectId(auth.userId);
  const limit = parsePositiveInteger(request.query.limit, 20, 100);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(request.query.search);
  const sortStr = normalizeSort(request.query.sort, WISHLIST_SORT_FIELDS, '-createdAt');

  let productFilter: mongoose.Types.ObjectId[] | null = null;
  if (search) {
    const matchingProducts = await Product.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ],
    })
      .select('_id')
      .lean();
    productFilter = matchingProducts.map((p: { _id: mongoose.Types.ObjectId }) => p._id);
    if (productFilter.length === 0) {
      sendResponse(reply, 200, {
        items: [],
        pagination: { page, limit, total: 0, totalPages: 1 },
      }, 'Wishlist loaded.');
      return;
    }
  }

  const filter: Record<string, unknown> = { user: userId };
  if (productFilter) filter.product = { $in: productFilter };

  const [items, total] = await Promise.all([
    Wishlist.find(filter)
      .sort(sortStr)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'product',
        select: 'name slug price images vendor',
        populate: { path: 'vendor', select: 'storeName slug name' },
      })
      .lean(),
    Wishlist.countDocuments(filter),
  ]);

  const mapped = (items as Record<string, unknown>[]).map(item =>
    shapeWishlistItem(item as { _id: unknown; createdAt?: unknown; product?: unknown })
  );

  sendResponse(reply, 200, {
    items: mapped,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  }, 'Wishlist loaded.');
}

export async function addToWishlist(
  request: FastifyRequest<{ Body: { productId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const { productId } = request.body;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Invalid productId', 400);
  }

  const product = await Product.findOne({
    _id: new mongoose.Types.ObjectId(productId),
    status: 'published',
  })
    .populate('vendor', 'storeName slug name')
    .lean();
  if (!product) throw new AppError('Product not found', 404);

  const userId = new mongoose.Types.ObjectId(auth.userId);
  const wishlistItem = await Wishlist.findOneAndUpdate(
    { user: userId, product: product._id },
    { $setOnInsert: { user: userId, product: product._id } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  )
    .populate({
      path: 'product',
      select: 'name slug price images vendor',
      populate: { path: 'vendor', select: 'storeName slug name' },
    })
    .lean();

  if (!wishlistItem) throw new AppError('Failed to add to wishlist', 500);

  const item = shapeWishlistItem(wishlistItem as { _id: unknown; createdAt?: unknown; product?: unknown });
  sendResponse(reply, 200, { item }, 'Item added to wishlist.');
}

export async function removeFromWishlist(
  request: FastifyRequest<{ Params: { productId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const { productId } = request.params;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Invalid productId', 400);
  }

  await Wishlist.findOneAndDelete({
    user: new mongoose.Types.ObjectId(auth.userId),
    product: new mongoose.Types.ObjectId(productId),
  });

  sendResponse(reply, 200, { success: true }, 'Item removed from wishlist.');
}

type CartItemInput = { productId: string; quantity: number; sku?: string };

async function loadCartWithProducts(userId: mongoose.Types.ObjectId) {
  const cart = await Cart.findOne({ user: userId })
    .populate({
      path: 'items.product',
      select: 'name slug price images vendor variationOptions variants',
      populate: { path: 'vendor', select: 'storeName slug name whatsapp' },
    })
    .lean();
  return cart;
}

function mapCart(cart: Record<string, unknown> | null | undefined) {
  if (!cart) {
    return { items: [], totalItems: 0, subtotal: 0 };
  }

  const rawItems = (cart.items as Array<Record<string, unknown>> | undefined) ?? [];
  const items = rawItems.map(item => {
    const product = item.product as Record<string, unknown> | undefined;
    const vendor = (product?.vendor ?? null) as Record<string, unknown> | null;
    const quantity = Number(item.quantity) || 0;
    const price = Number(product?.price ?? 0);
    const lineTotal = quantity * price;

    return {
      productId: product?._id != null ? String(product._id) : '',
      quantity,
      sku: item.sku as string | undefined,
      product: product
        ? {
            _id: product._id != null ? String(product._id) : '',
            name: product.name,
            slug: product.slug,
            price,
            image: Array.isArray(product.images) ? (product.images as string[])[0] : undefined,
            vendorSlug: vendor?.slug,
            vendorName: vendor?.storeName ?? vendor?.name,
            whatsapp: vendor?.whatsapp,
            variationOptions: product.variationOptions,
            variants: product.variants,
          }
        : undefined,
      lineTotal,
    };
  });

  const totalItems = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  const subtotal = items.reduce((sum, it) => sum + (it.lineTotal || 0), 0);

  return { items, totalItems, subtotal };
}

async function upsertCartItem(userId: mongoose.Types.ObjectId, input: CartItemInput) {
  const { productId, quantity, sku } = input;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Invalid productId', 400);
  }

  const product = await Product.findOne({
    _id: new mongoose.Types.ObjectId(productId),
    status: 'published',
  })
    .select('_id price inStock variants')
    .lean();
  if (!product) throw new AppError('Product not found', 404);

  if (product.variants?.length) {
    if (!sku || String(sku).trim() === '') {
      throw new AppError('sku is required for variant products', 400);
    }
  }

  const cart =
    (await Cart.findOne({ user: userId }).lean()) ??
    (await Cart.create({ user: userId, items: [] }).then(doc => doc.toObject()));

  const items = (cart.items as Array<{ product: mongoose.Types.ObjectId; quantity: number; sku?: string }> | undefined) ?? [];
  const existingIndex = items.findIndex(
    it =>
      String(it.product) === productId &&
      ((it.sku ?? '') === (sku ?? '') || (!it.sku && !sku))
  );

  if (existingIndex === -1) {
    items.push({
      product: new mongoose.Types.ObjectId(productId),
      quantity,
      ...(sku ? { sku } : {}),
    });
  } else {
    items[existingIndex].quantity = quantity;
    if (sku) items[existingIndex].sku = sku;
  }

  await Cart.updateOne(
    { user: userId },
    { $set: { items } },
    { upsert: true }
  );
}

export async function getCart(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const userId = new mongoose.Types.ObjectId(auth.userId);
  const cart = await loadCartWithProducts(userId);
  const shaped = mapCart(cart as Record<string, unknown> | null | undefined);
  sendResponse(reply, 200, shaped, 'Cart loaded.');
}

export async function addToCart(
  request: FastifyRequest<{ Body: CartItemInput }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const body = request.body;
  if (body.quantity < 1) {
    throw new AppError('Quantity must be at least 1', 400);
  }

  const userId = new mongoose.Types.ObjectId(auth.userId);
  await upsertCartItem(userId, body);
  const cart = await loadCartWithProducts(userId);
  const shaped = mapCart(cart as Record<string, unknown> | null | undefined);

  sendResponse(reply, 200, shaped, 'Cart updated.');
}

export async function updateCart(
  request: FastifyRequest<{ Body: { productId?: string; quantity?: number; updates?: CartItemInput[] } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const userId = new mongoose.Types.ObjectId(auth.userId);

  const body = request.body ?? {};
  const updates: CartItemInput[] =
    body.updates && Array.isArray(body.updates)
      ? body.updates
      : body.productId != null && body.quantity != null
      ? [{ productId: body.productId, quantity: body.quantity, sku: (body as CartItemInput).sku }]
      : [];

  if (!updates.length) {
    throw new AppError('No updates provided', 400);
  }

  const cart = await Cart.findOne({ user: userId }).lean();
  if (!cart) {
    sendResponse(reply, 200, { items: [], totalItems: 0, subtotal: 0 }, 'Cart updated.');
    return;
  }

  const items = (cart.items as Array<{ product: mongoose.Types.ObjectId; quantity: number; sku?: string }> | undefined) ?? [];

  for (const upd of updates) {
    if (!mongoose.Types.ObjectId.isValid(upd.productId)) {
      throw new AppError('Invalid productId', 400);
    }
    const index = items.findIndex(
      it => String(it.product) === upd.productId && ((it.sku ?? '') === (upd.sku ?? '') || (!it.sku && !upd.sku))
    );
    if (upd.quantity != null && upd.quantity < 1) {
      if (index !== -1) {
        items.splice(index, 1);
      }
    } else if (index !== -1 && upd.quantity != null) {
      items[index].quantity = upd.quantity;
    }
  }

  await Cart.updateOne(
    { user: userId },
    { $set: { items } }
  );

  const updated = await loadCartWithProducts(userId);
  const shaped = mapCart(updated as Record<string, unknown> | null | undefined);

  sendResponse(reply, 200, shaped, 'Cart updated.');
}

export async function removeFromCart(
  request: FastifyRequest<{ Params: { productId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const { productId } = request.params;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Invalid productId', 400);
  }

  const userId = new mongoose.Types.ObjectId(auth.userId);
  await Cart.updateOne(
    { user: userId },
    { $pull: { items: { product: new mongoose.Types.ObjectId(productId) } } }
  );

  const cart = await loadCartWithProducts(userId);
  const shaped = mapCart(cart as Record<string, unknown> | null | undefined);
  sendResponse(reply, 200, shaped, 'Cart updated.');
}

export async function clearCart(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  const userId = new mongoose.Types.ObjectId(auth.userId);
  await Cart.updateOne({ user: userId }, { $set: { items: [] } }, { upsert: true });

  sendResponse(
    reply,
    200,
    { items: [], totalItems: 0, subtotal: 0 },
    'Cart cleared.'
  );
}

