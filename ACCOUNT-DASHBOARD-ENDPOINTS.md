# Account Dashboard – Expected API Endpoints

This document describes the endpoints required by the oj-multimedia account dashboard. Implement these so responses match the types in `lib/constants/endpoints.ts` in the frontend repo.

---

## User & profile

### GET /user/me

- **Method:** GET
- **Auth:** Required (session/cookie)
- **Query:** None
- **Response:** `IUserMeRes`
  ```ts
  { user: PopulatedUser }
  ```
- **Populations:**
  - `user.artist`: when the user has an artist profile, populate as `{ _id, name, slug, image? }`
  - `user.vendor`: when the user has a vendor profile, populate as `{ _id, name?, slug, storeName }`

### PATCH /user/me

- **Method:** PATCH
- **Auth:** Required
- **Body:** `IUserUpdateMePayload`
  ```ts
  { firstName?: string; lastName?: string; email?: string; phoneNumber?: string; avatar?: string }
  ```
- **Response:** Same as GET /user/me (`IUserMeRes`)
- **Note:** The frontend may send `email`; the backend may treat it as read-only (e.g. require a separate verification flow to change email).

---

## Wishlist

### GET /user/wishlist

- **Method:** GET
- **Auth:** Required
- **Query (optional):**
  - `page` (number, default 1)
  - `limit` (number, default e.g. 20)
- **Response:** `IUserWishlistListRes`
  ```ts
  {
    items: IUserWishlistItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }
  ```
- **Item shape:** Each `IUserWishlistItem`: `_id`, `createdAt`, `product`
- **Populations:**
  - `product`: full product summary including `images[]`
  - `product.vendor`: `{ name: string; slug: string }`

### POST /user/wishlist

- **Method:** POST
- **Auth:** Required
- **Body:** `IUserWishlistAddPayload`
  ```ts
  { productId: string }
  ```
- **Response:** `IUserWishlistAddRes` – `{ item: IUserWishlistItem }` (same populations as list)

### DELETE /user/wishlist/:productId

- **Method:** DELETE
- **Auth:** Required
- **Params:** `productId` – ID of the product to remove from wishlist
- **Response:** `{ success: boolean }`

---

## Auth

### PATCH /auth/change-password

- **Method:** PATCH
- **Auth:** Required (current session)
- **Body:** `IAuthChangePasswordPayload`
  ```ts
  { currentPassword: string; password: string; confirmPassword: string }
  ```
  The frontend sends `password` as the new password; `confirmPassword` must match (validation may be done client-side only or also on the server).
- **Response:** `IAuthChangePasswordRes` – `{ message: string; user: ClientAdmin | PopulatedUser }`

---

## Marketplace (customer orders)

### GET /marketplace/orders

- **Method:** GET
- **Auth:** Required (returns the authenticated user’s orders only)
- **Query (optional):**
  - `page` (number)
  - `limit` (number)
  - `status` (string, filter by order status)
- **Response:** `IMarketplaceMyOrdersRes`
  ```ts
  {
    orders: PopulatedMarketplaceOrder[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }
  ```
- **Populations per order:**
  - `vendor`: `PopulatedVendorSummary` – `{ _id, name?, slug, storeName }`
  - `items[].product`: product details needed for display (e.g. name, slug, price, images)

---

## Type reference (frontend)

- `PopulatedUser`, `IUserWishlistItem`, `IUserWishlistProductSummary` – see `lib/constants/endpoints.ts`
- `PopulatedMarketplaceOrder`, `PopulatedVendorSummary`, `GetListRes` – same file
- Ensure IDs and dates are serialized as strings in JSON (e.g. no raw ObjectId or Date objects)

---

## Frontend usage notes

- **GET /user/wishlist:** The account wishlist page currently calls this without query params (first page only). Pagination query params are supported for future use.
- **PATCH /user/me:** The profile form includes an email field; the frontend sends `email` in the payload when present. Backend may accept it for update or treat it as read-only.
- **GET /marketplace/orders:** The account orders page uses optional query params `page`, `limit`, and `status` for server-side initial load and client-side refetch (via nuqs).
