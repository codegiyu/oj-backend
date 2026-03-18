# Marketplace API — Types, Constants & Endpoints (for oj-multimedia)

This document is intended for the **oj-multimedia** frontend. It describes the Marketplace API types, constants, and endpoint contract (paths, query/body payloads, response shapes) so the frontend can type requests and parse responses consistently.

**Base URL for marketplace endpoints:** `{API_BASE}/marketplace` and `{API_BASE}/user`

All success responses are wrapped as:

```ts
{
  success: true;
  message: string;
  responseCode: number;
  data: { ... }; // payload below
}
```

Error responses: `{ success: false, message: string, responseCode: number, data?: unknown }` with appropriate HTTP status codes.

---

## 1. Shared types

```ts
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### 1.1 Category & SubCategory

```ts
export interface MarketplaceCategory {
  _id: string;
  name: string;
  slug: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface MarketplaceSubCategory {
  _id: string;
  category: string; // category id
  name: string;
  slug: string;
  displayOrder?: number;
  isActive?: boolean;
}
```

### 1.2 Vendor (public summary)

```ts
export interface MarketplaceVendor {
  _id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  storeName: string;
  storeDescription?: string;
  logo?: string;
  coverImage?: string;
  whatsapp?: string;
  address?: string;
  productCount?: number;
}
```

### 1.3 Product (public summary)

The backend always populates `category` and `subCategory` (when present) with `{ _id, name, slug }`. Vendor information is exposed via `vendorName`, `vendorSlug`, and `vendorWhatsapp`.

```ts
export interface MarketplaceProductCategoryRef {
  _id: string;
  name: string;
  slug: string;
}

export interface MarketplaceProduct {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  images: string[];
  inStock: boolean;
  isFeatured: boolean;
  displayOrder: number;
  vendor: string; // vendor id
  vendorName?: string;
  vendorSlug?: string;
  vendorWhatsapp?: string | null;
  category?: MarketplaceProductCategoryRef;
  subCategory?: MarketplaceProductCategoryRef & { category?: string };
}
```

### 1.4 Wishlist item (user)

```ts
export interface WishlistProductSummary {
  _id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  vendor?: {
    _id: string;
    storeName?: string;
    slug?: string;
    name?: string;
  };
}

export interface WishlistItem {
  _id: string;
  createdAt: string;
  product: WishlistProductSummary;
}
```

### 1.5 Cart item (user)

Cart items include a populated **product summary** with vendor WhatsApp to enable "Chat with vendor" links.

```ts
export interface CartProductVariantOption {
  name: string;
  values: string[];
}

export interface CartProductVariant {
  options: Record<string, string>;
  price: number;
  inStock: boolean;
  isDefault: boolean;
  sku?: string;
  image?: string;
}

export interface CartProductSummary {
  _id: string;
  name: string;
  slug: string;
  price: number;
  image?: string;
  vendorSlug?: string;
  vendorName?: string;
  whatsapp?: string;
  variationOptions?: CartProductVariantOption[];
  variants?: CartProductVariant[];
}

export interface CartItem {
  productId: string;
  quantity: number;
  sku?: string;
  product?: CartProductSummary;
  lineTotal?: number;
}

export interface CartData {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
}
```

### 1.6 Orders

```ts
export interface MarketplaceOrderItemProductSummary {
  _id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  image?: string;
}

export interface MarketplaceOrderItem {
  product: MarketplaceOrderItemProductSummary;
  productName?: string;
  quantity: number;
  price: number;
  totalPrice: number;
  sku?: string;
  selectedOptions?: Record<string, string>;
}

export interface MarketplaceOrderVendorSummary {
  _id?: string;
  name?: string;
  slug?: string;
  storeName?: string;
}

export interface MarketplaceOrder {
  _id: string;
  orderNumber: string;
  customer: { name: string; email: string; phone: string; address?: string };
  vendor: MarketplaceOrderVendorSummary;
  items: MarketplaceOrderItem[];
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt?: string;
  updatedAt?: string;
  whatsappLink?: string | null;
}
```

---

## 2. Endpoints — marketplace public

Base prefix: **`/marketplace`**

### 2.1 `GET /marketplace/categories`

- **Query:** `includeInactive?: '1'`
- **data:** `{ categories: MarketplaceCategory[] }`

### 2.2 `GET /marketplace/subcategories`

- **Query:** `category?: string` (category `_id` or slug)
- **data:** `{ subcategories: MarketplaceSubCategory[] }`

### 2.3 `GET /marketplace/vendors`

- **Query:** `page?: string; limit?: string; sort?: string; q?: string`  
  (Note: backend currently supports `status=active` and optional `productCount`; `page/limit/sort/q` may be added later; respond defensively.)
- **data:** `{ vendors: MarketplaceVendor[]; pagination?: Pagination }`

### 2.4 `GET /marketplace/vendors/:slug`

- **Params:** `slug: string`
- **data:** `MarketplaceVendor & { productCount: number }`

### 2.5 `GET /marketplace/products`

- **Query:**
  - `page?: string`
  - `limit?: string`
  - `category?: string` (slug or id)
  - `subCategory?: string` (slug or id)
  - `featured?: 'true' | 'false'`
  - `q?: string` or `search?: string` (search term)
  - `sort?: 'recent' | 'price-asc' | 'price-desc' | 'hot' | string`
- **data:** `{ products: MarketplaceProduct[]; pagination: Pagination }`

> Note: `sort` values:
> - `recent` → newest first
> - `price-asc` → lowest price first
> - `price-desc` → highest price first
> - `hot` → featured / priority products (displayOrder + createdAt)

### 2.6 `GET /marketplace/products/:slug`

- **Params:** `slug: string`
- **data:** `MarketplaceProduct` (single object with `vendorName`, `vendorSlug`, `vendorWhatsapp`, `category`, `subCategory` populated)

---

## 3. Endpoints — user wishlist (auth required)

Base prefix: **`/user`**, auth via bearer token; `scope === 'client-access'`.

### 3.1 `GET /user/wishlist`

- **Query:** `page?: string; limit?: string; search?: string; sort?: string`
- **data:** `{ items: WishlistItem[]; pagination: Pagination }`

### 3.2 `POST /user/wishlist`

- **Body:** `{ productId: string }`
- **data:** `{ item: WishlistItem }`

### 3.3 `DELETE /user/wishlist/:productId`

- **Params:** `productId: string`
- **data:** `{ success: true }`

---

## 4. Endpoints — user cart (auth required)

Base prefix: **`/user`**, auth via bearer token; `scope === 'client-access'`.

### 4.1 `GET /user/cart`

- **data:** `CartData`

Shape:

```ts
{
  items: CartItem[];
  totalItems: number;
  subtotal: number;
}
```

### 4.2 `POST /user/cart`

Adds or updates a single cart item.

- **Body:**

```ts
{
  productId: string;
  quantity: number; // must be >= 1
  sku?: string;     // required for variant products
}
```

- **Behaviour:** If the same product (and sku, when present) already exists in cart, its `quantity` is set to the provided value; otherwise a new item is inserted.
- **data:** Updated `CartData` (same as GET).

### 4.3 `PATCH /user/cart`

Updates one or more items; quantities \< 1 remove items.

- **Body:** either

```ts
{ productId: string; quantity: number; } // single update
// or
{ updates: { productId: string; quantity: number; }[] } // bulk
```

- **data:** Updated `CartData`.

### 4.4 `DELETE /user/cart/:productId`

Removes all cart items for a given product id (any sku).

- **Params:** `productId: string`
- **data:** Updated `CartData`.

### 4.5 `DELETE /user/cart`

Clears the cart.

- **data:** `{ items: [], totalItems: 0, subtotal: 0 }`

---

## 5. Endpoints — place order & WhatsApp (public / auth)

Base prefix: **`/marketplace`**.

### 5.1 `POST /marketplace/orders`

Creates one order per vendor (multi-vendor support) and returns WhatsApp links for each when possible.

- **Auth:** Optional; when authenticated with client token, `customerId` is set to the user id.
- **Body:**

```ts
export interface PlaceOrderBodyCustomer {
  name: string;
  email: string;
  phone: string;
  address?: string;
}

export interface PlaceOrderBodyItem {
  productId: string;
  productName?: string;
  quantity: number;
  price: number;
  sku?: string; // required if product has variants
}

export interface PlaceOrderBody {
  customer: PlaceOrderBodyCustomer;
  items: PlaceOrderBodyItem[];
}
```

- **data (single-vendor):**

```ts
{ order: MarketplaceOrder }
```

- **data (multi-vendor):**

```ts
{ orders: MarketplaceOrder[] }
```

Each `MarketplaceOrder` may include a `whatsappLink?: string | null`:

- If vendor has a `whatsapp` number:
  - Backend formats a message summarizing the order (customer, items, totals) and embeds it into a `wa.me` URL:
  - `https://wa.me/{digits}?text={encodedMessage}`
  - This URL is returned as `whatsappLink`.
- If vendor has no `whatsapp`, `whatsappLink` will be `null` or omitted.

The backend also enqueues a background notification job when vendor `whatsapp` is present; frontend does not need to react to this.

### 5.2 `GET /marketplace/orders`

Returns orders for the authenticated user.

- **Auth:** Required (`scope === 'client-access'`).
- **Query:** `page?: string; limit?: string; status?: string; search?: string; sort?: string`
- **data:** `{ orders: MarketplaceOrder[]; pagination: Pagination }`

> Note: `MarketplaceOrder` objects returned here may also include `whatsappLink` (if available).

### 5.3 `GET /marketplace/orders/:orderId/whatsapp-link`

Returns (or regenerates) the WhatsApp link and message for a specific order.

- **Auth:** Required (`scope === 'client-access'`).
- **Params:** `orderId: string` (Mongo `_id`)
- **data:**

```ts
{
  whatsappLink: string | null;
  message: string;
}
```

- If the vendor has a WhatsApp number:
  - `whatsappLink` is a `wa.me` URL built from the current order state.
- If the vendor has no WhatsApp number:
  - `whatsappLink` is `null`, but `message` still contains the formatted order summary (in case the frontend needs to display or copy it).

---

## 6. Summary

- All marketplace read endpoints live under `/marketplace`.
- Cart and wishlist live under `/user` and require an authenticated client token.
- Product responses populate `category`, `subCategory`, and expose vendor WhatsApp for building frontend chat links.
- `POST /marketplace/orders` supports multi-vendor carts by creating one order per vendor and returns an array when needed.
- `GET /marketplace/orders/:orderId/whatsapp-link` is a helper for generating/refreshing WhatsApp deep links per order.

Copy this file into the **oj-multimedia** repo (e.g. project root or `docs/`) and wire types into `lib/constants/endpoints.ts` and API clients accordingly.

