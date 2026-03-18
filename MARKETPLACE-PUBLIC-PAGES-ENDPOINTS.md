# Marketplace Public Pages & Mutations — API Specification (oj-multimedia)

This document describes **read** and **mutation** endpoints for the marketplace: categories, subcategories, vendors, products, search, **cart**, **wishlist**, and **place order** (with order document creation and WhatsApp notification to vendor). It extends [MARKETPLACE-CATEGORIES-PRODUCTS.md](./MARKETPLACE-CATEGORIES-PRODUCTS.md) and aligns with the frontend `lib/constants/endpoints.ts`.

**Response wrapper:** All success responses: `{ success: true, message?: string, responseCode?: number, data: { ... } }`. Errors: `{ success: false, message: string, responseCode: number }` with appropriate HTTP status.

---

## 1. Product response: vendor population and WhatsApp

For all product responses (list products, get product by slug, cart item product summary, etc.), when **vendor** is populated (or when `vendorName` / `vendorSlug` are returned), the vendor data **must include**:

- `_id`, `name`, `slug`, `storeName`
- **`whatsapp`** (string, optional): the vendor's WhatsApp number (e.g. E.164). Used by the frontend to build the "Chat with vendor" link: `https://wa.me/{cleanedNumber}?text={encodedMessage}`. No separate endpoint is required; the link is derived from this field.

---

## 2. Read endpoints (public, no auth unless noted)

### 2.1 List categories

- **Path:** `GET /marketplace/categories`
- **Query:** `includeInactive=1` (optional) — include inactive categories. Default: active only.
- **Response `data`:** `{ categories: Array<{ _id, name, slug, displayOrder?, isActive? }> }`

See MARKETPLACE-CATEGORIES-PRODUCTS.md §2.1.

---

### 2.2 List subcategories

- **Path:** `GET /marketplace/subcategories`
- **Query:** `category` (optional) — category `_id` or slug. When provided, only subcategories for that category.
- **Response `data`:** `{ subcategories: Array<{ _id, category, name, slug, displayOrder?, isActive? }> }`

See MARKETPLACE-CATEGORIES-PRODUCTS.md §2.2.

---

### 2.3 List vendors

- **Path:** `GET /marketplace/vendors`
- **Query:** `page`, `limit`, optional `sort`, `q` (search).
- **Response `data`:** `{ vendors: Vendor[], pagination: { page, limit, total, totalPages } }`. Each vendor may include `productCount` (optional).

---

### 2.4 Vendor by slug

- **Path:** `GET /marketplace/vendors/:slug`
- **Response `data`:** Single vendor object (full or summary). Include `whatsapp` when present.

---

### 2.5 List products

- **Path:** `GET /marketplace/products`
- **Query:** `page`, `limit`, `category` (slug), `subCategory` (slug), `vendor` (id or slug), `sort` (e.g. `recent`, `price-asc`, `price-desc`, `hot`), `featured` (0/1), `q` (search). Optional: `minPrice`, `maxPrice` if supported.
- **Response `data`:** `{ products: Product[], pagination: { page, limit, total, totalPages } }`. Each product: **category** and **subCategory** populated with at least `{ _id, name, slug }`; **vendor** (or vendor fields) must include **whatsapp** when available (see §1).

---

### 2.6 Product by slug

- **Path:** `GET /marketplace/products/:slug`
- **Response `data`:** Single product. **category**, **subCategory**, and **vendor** populated; vendor must include **whatsapp** when available.

---

### 2.7 Featured / hot products (for marketplace landing)

Use **GET /marketplace/products** with query params, e.g.:

- Featured: `featured=1&limit=8`
- Hot (e.g. by views/orders): `sort=hot&limit=8`
- Recent: `sort=recent&limit=12`

No separate endpoint required unless the backend prefers dedicated routes; document the same response shape as list products.

---

## 3. Cart endpoints (auth required)

Cart is **required** and persisted per authenticated user. Guest cart may remain client-only; on login, frontend may merge local cart into backend (POST each item).

### 3.1 Get cart

- **Path:** `GET /user/cart`
- **Auth:** Required (user).
- **Response `data`:** `{ items: CartItem[] }` and optionally `totalItems`, `subtotal`. Each **CartItem**: `productId`, `quantity`, `sku?`, **product** (populated summary: `_id`, `name`, `slug`, `image` or `images[0]`, `price`, `vendorSlug`, `vendorName`, and optionally vendor `whatsapp` for "Chat" link).

**CartItem type (backend):**

| Field      | Type   | Description                    |
|------------|--------|--------------------------------|
| productId  | string | Product _id                   |
| quantity   | number | Quantity                       |
| sku        | string | Optional; variant SKU          |
| product    | object | Populated product summary      |

---

### 3.2 Add to cart (or update quantity)

- **Path:** `POST /user/cart`
- **Auth:** Required.
- **Request body:** `{ productId: string; quantity: number; sku?: string }`
- **Behaviour:** If item exists, update quantity (and sku if provided); otherwise add. Validate product exists and is purchasable.
- **Response `data`:** Updated cart (same shape as GET) or `{ item: CartItem }` and optionally full cart.

---

### 3.3 Update cart item quantity

- **Path:** `PATCH /user/cart`
- **Auth:** Required.
- **Request body:** `{ productId: string; quantity: number }` or `{ updates: Array<{ productId: string; quantity: number }> }`
- **Behaviour:** Set quantity; if quantity &lt; 1, remove item.
- **Response `data`:** Updated cart (same shape as GET).

---

### 3.4 Remove item from cart

- **Path:** `DELETE /user/cart/:productId`
- **Auth:** Required.
- **Response `data`:** `{ success: boolean }` or updated cart.

---

### 3.5 Clear cart

- **Path:** `DELETE /user/cart`
- **Auth:** Required.
- **Response `data`:** `{ success: boolean }` or `{ items: [] }`.

---

## 4. Wishlist endpoints (auth required)

### 4.1 List wishlist

- **Path:** `GET /user/wishlist`
- **Auth:** Required.
- **Query:** Optional `page`, `limit`.
- **Response `data`:** `{ items: WishlistItem[], pagination?: { page, limit, total, totalPages } }`. Each item: `_id`, `createdAt`, **product** (populated summary: _id, name, slug, price, images, vendor name/slug).

---

### 4.2 Add to wishlist

- **Path:** `POST /user/wishlist`
- **Auth:** Required.
- **Request body:** `{ productId: string }`
- **Response `data`:** `{ item: WishlistItem }`.

---

### 4.3 Remove from wishlist

- **Path:** `DELETE /user/wishlist/:productId`
- **Auth:** Required.
- **Response `data`:** `{ success: boolean }`.

---

## 5. Place order (mutation)

### 5.1 Create order and notify vendor via WhatsApp

- **Path:** `POST /marketplace/orders`
- **Auth:** Optional (guest) or required (user); document as per product decision.
- **Request body:**

| Field    | Type   | Required | Description                          |
|----------|--------|----------|--------------------------------------|
| customer | object | yes      | `{ name, email, phone, address? }`  |
| items    | array  | yes      | `[{ productId, productName?, quantity, price, sku? }]` |

- **Backend behaviour:**
  1. Validate payload; resolve product and vendor for each item.
  2. Create **one order document per vendor** (if items span multiple vendors). Each order: customer, items for that vendor, totals, status, paymentStatus, timestamps, orderNumber, etc.
  3. For each created order: **format** order details into a WhatsApp message (customer info, order ref, line items, totals, delivery address, notes, timestamp). Reference: Chi's Corner style formatter (customer name/phone/email, order ID, items with name/qty/price/subtotal, order summary, address, notes).
  4. **Send to vendor's WhatsApp number:** Use the vendor's `whatsapp` from the vendor document. Either (a) return a `whatsappLink` (e.g. `https://wa.me/{number}?text={encodedMessage}`) in the response so the frontend can open it (customer or system sends to vendor), or (b) backend sends via WhatsApp Business API. Document which is implemented.
  5. Return created order(s) and, if applicable, `whatsappLink` or `orders[].whatsappLink`.

- **Response `data`:** At minimum: `{ order: PopulatedOrder }` (single vendor) or `{ orders: PopulatedOrder[] }` (multi-vendor). Optionally: `whatsappLink?: string` (single vendor) or per-order link in each order object. PopulatedOrder: order with vendor and items populated (product summary on each item).

---

## 6. Get WhatsApp link for existing order (optional)

- **Path:** `GET /marketplace/orders/:orderId/whatsapp-link` or `POST /marketplace/orders/:orderId/whatsapp-link`
- **Auth:** Required; order must belong to current user (or be accessible).
- **Response `data`:** `{ whatsappLink: string; message?: string }`. Backend loads order, resolves vendor whatsapp, formats message, returns link. Frontend can open link to send to vendor.

---

## 7. My orders (auth required)

- **Path:** `GET /marketplace/orders`
- **Query:** `page`, `limit`, optional `status`.
- **Response `data`:** `{ orders: PopulatedOrder[], pagination: { page, limit, total, totalPages } }`.

---

## 8. Path summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /marketplace/categories | No | List categories |
| GET | /marketplace/subcategories | No | List subcategories |
| GET | /marketplace/vendors | No | List vendors |
| GET | /marketplace/vendors/:slug | No | Vendor by slug |
| GET | /marketplace/products | No | List products (filters, sort, search) |
| GET | /marketplace/products/:slug | No | Product by slug |
| GET | /user/cart | Yes | Get cart |
| POST | /user/cart | Yes | Add/update cart item |
| PATCH | /user/cart | Yes | Update cart item quantity |
| DELETE | /user/cart/:productId | Yes | Remove cart item |
| DELETE | /user/cart | Yes | Clear cart |
| GET | /user/wishlist | Yes | List wishlist |
| POST | /user/wishlist | Yes | Add to wishlist |
| DELETE | /user/wishlist/:productId | Yes | Remove from wishlist |
| POST | /marketplace/orders | Optional | Place order (create doc + WhatsApp to vendor) |
| GET | /marketplace/orders/:orderId/whatsapp-link | Yes | Get WhatsApp link for order (optional) |
| GET | /marketplace/orders | Yes | My orders |

---

## 9. Notes

- **Vendor whatsapp:** Stored in vendor document; must be included in product response when vendor is populated so the frontend can build the "Chat with vendor" link.
- **Order → WhatsApp:** After creating order document(s), format message (Chi's Corner style) and send to vendor's whatsapp (return link or server-side send).
- **Uncategorized products:** Frontend displays as "Others" category; no backend change needed.
- **Pagination:** All list responses use `page` (1-based), `limit`, and return `pagination: { page, limit, total, totalPages }`.
