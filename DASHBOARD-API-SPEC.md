# Dashboard API Specification

This document describes the backend operations needed to support the **user**, **artist**, and **vendor** dashboards in the `oj-multimedia` frontend.

- All endpoints are assumed to be authenticated unless marked otherwise.
- Where referenced fields are populated (e.g. `user.artist`), this is called out explicitly.
- Paths and groupings are aligned with the existing frontend endpoint constants where applicable.

---

## 1. User Dashboard (`/account`)

### 1.1 Auth session

- **Path**: `/auth/session`
- **Method**: `GET`
- **Used by**: App shell, account home, conditional Artist/Vendor links
- **Description**: Returns the current authenticated user (admin or client) and basic session info.
- **Response**:
  - `user: ClientAdmin | PopulatedUser | null`
- **Populations** (when `user` is a client user):
  - `user.artist` → `{ _id, name, slug, image? }`
  - `user.vendor` → `{ _id, slug, storeName, name? }`

### 1.2 Get account profile

- **Path**: `/user/me` (or `/account/profile`)
- **Method**: `GET`
- **Used by**: Account Settings load
- **Description**: Fetch the current user’s profile and linked entities.
- **Response**:
  - `user: PopulatedUser`
- **Populations**:
  - Same as `/auth/session`.

### 1.3 Update account profile

- **Path**: `/user/me` (or `/account/profile`)
- **Method**: `PATCH`
- **Used by**: Account Settings save
- **Description**: Update profile information such as display name, email, and phone.
- **Request body** (example):
  - `{ firstName?, lastName?, phoneNumber?, avatar? }`
- **Response**:
  - `user: PopulatedUser` (updated; same populations as GET).

### 1.4 Change password

- **Path**: `/auth/change-password`
- **Method**: `PATCH`
- **Used by**: Account Settings → Change password section
- **Description**: Change the current user’s password.
- **Request body**:
  - `{ currentPassword: string; password: string; confirmPassword: string }`
- **Response**:
  - `{ message: string; user: PopulatedUser }`

### 1.5 List my orders

- **Path**: `/marketplace/orders`
- **Method**: `GET`
- **Used by**: `/account/orders`
- **Description**: Returns the current customer’s orders in reverse-chronological order.
- **Query params** (optional):
  - Pagination: `page`, `limit`
  - Status filter: `status` (e.g. `pending`, `confirmed`, `delivered`, etc.)
- **Response**:
  - `{ orders: PopulatedMarketplaceOrder[] }`
- **Populations**:
  - `orders[].vendor` → `{ _id, name?, slug, storeName }`
  - `orders[].items[].product` → `{ _id, name, slug, image? }`

### 1.6 Wishlist

#### 1.6.1 List wishlist items

- **Path**: `/user/wishlist`
- **Method**: `GET`
- **Used by**: `/account/wishlist`
- **Description**: Fetch the current user’s wishlist items.
- **Response** (suggested shape):
  - `{ items: Array<{ _id: string; createdAt: string; product: { _id: string; name: string; slug: string; price: number; images: string[]; vendor?: { name: string; slug: string } } }> }`
- **Populations**:
  - `items[].product` populated as above (product snapshot for display and linking).

#### 1.6.2 Add to wishlist

- **Path**: `/user/wishlist`
- **Method**: `POST`
- **Used by**: “Add to wishlist” button on product cards.
- **Request body**:
  - `{ productId: string }`
- **Response**:
  - Either the full updated wishlist `{ items: [...] }` or the created wishlist item:
  - `item: { _id: string; product: { _id, name, slug, price, images, vendor?: { name, slug } } }`
- **Populations**:
  - `product` populated with the same fields as in the GET.

#### 1.6.3 Remove from wishlist

- **Path**: `/user/wishlist/:productId` (or body+DELETE)
- **Method**: `DELETE`
- **Used by**: “Remove” action on Wishlist.
- **Description**: Remove a single product from the wishlist.
- **Response**:
  - `{ success: boolean }` (no additional populations required).

---

## 2. Artist Dashboard (`/account/artist-portal`)

### 2.1 Get artist profile

- **Path**: `/artist/me`
- **Method**: `GET`
- **Used by**: Artist portal layout, Artist Portal home.
- **Description**: Fetch the current user’s linked artist profile.
- **Response**:
  - `artist: { _id, name, slug, bio?, image?, coverImage?, genre?, socials?, isFeatured, isActive, displayOrder, createdAt, updatedAt }`
- **Populations**:
  - None required beyond the main artist document.

### 2.2 Update artist profile

- **Path**: `/artist/me`
- **Method**: `PATCH`
- **Used by**: Future Artist Settings page.
- **Description**: Update the artist profile (bio, image, socials, etc.).
- **Request body** (example):
  - `{ name?, bio?, image?, coverImage?, genre?, socials? }`
- **Response**:
  - `artist` (same fields as GET).

### 2.3 List my music

- **Path**: `/artist/music`
- **Method**: `GET`
- **Used by**: Artist Portal → Music page.
- **Description**: List music items owned by the current artist, with filtering and pagination.
- **Query params**:
  - `page`, `limit`
  - `status?` (e.g. `draft`, `published`, `archived`)
- **Response**:
  - `{ music: Array<{ _id, title, slug, status, views, downloads, createdAt, updatedAt, artist?: { _id, name, slug, image? } }> , pagination: { page, limit, total, totalPages } }`
- **Populations**:
  - Optional `artist` populated `{ _id, name, slug, image? }` for consistency with other parts of the app.

### 2.4 Create music

- **Path**: `/artist/music`
- **Method**: `POST`
- **Used by**: Artist Portal → Upload (when type = Music), “Add track”.
- **Description**: Create a new music item for the current artist, using previously uploaded media URLs or keys.
- **Request body** (example):
  - `{ title: string; description?: string; lyrics?: string; coverImage?: string; audioUrl?: string; videoUrl?: string; category?: string; isMonetizable?: boolean }`
- **Response**:
  - `music: { _id, title, slug, status, views, downloads, createdAt, updatedAt, artist: { _id, name, slug, image? } }`
- **Populations**:
  - `artist` populated `{ _id, name, slug, image? }`.

### 2.5 Update music

- **Path**: `/artist/music/:id`
- **Method**: `PATCH`
- **Used by**: Edit track form on Music page.
- **Description**: Update an existing music item (title, description, status, etc.).
- **Request body**:
  - Partial music fields: `{ title?, description?, lyrics?, coverImage?, audioUrl?, videoUrl?, category?, status?, isMonetizable? }`
- **Response**:
  - Updated `music` with populated `artist` (same shape as in create).

### 2.6 Archive/delete music

- **Path**: `/artist/music/:id`
- **Method**: `DELETE` (or `PATCH` with `{ status: 'archived' }`)
- **Used by**: Archive/Delete action for a track.
- **Description**: Soft-delete or archive a music item.
- **Response**:
  - `{ success: boolean }`

### 2.7 List my videos

- **Path**: `/artist/videos`
- **Method**: `GET`
- **Used by**: Artist Portal → Videos page.
- **Description**: List video items owned by the current artist.
- **Query params**:
  - `page`, `limit`
  - `status?`
- **Response**:
  - `{ videos: Array<{ _id, title, slug, status, views, createdAt, updatedAt, artist?: { _id, name, slug, image? } }>, pagination: { page, limit, total, totalPages } }`
- **Populations**:
  - Optional `artist` populated `{ _id, name, slug, image? }`.

### 2.8 Create video

- **Path**: `/artist/videos`
- **Method**: `POST`
- **Used by**: Artist Portal → Upload (when type = Video).
- **Description**: Create a new video item for the current artist.
- **Request body** (example):
  - `{ title: string; description?: string; thumbnail?: string; videoUrl?: string; category?: string; isMonetizable?: boolean }`
- **Response**:
  - `video: { _id, title, slug, status, views, createdAt, updatedAt, artist: { _id, name, slug, image? } }`
- **Populations**:
  - `artist` populated `{ _id, name, slug, image? }`.

### 2.9 Update video

- **Path**: `/artist/videos/:id`
- **Method**: `PATCH`
- **Used by**: Edit video form.
- **Description**: Update an existing video item.
- **Request body**:
  - Partial video fields: `{ title?, description?, thumbnail?, videoUrl?, category?, status?, isMonetizable? }`
- **Response**:
  - Updated `video` with populated `artist`.

### 2.10 Archive/delete video

- **Path**: `/artist/videos/:id`
- **Method**: `DELETE` (or `PATCH` archive)
- **Used by**: Archive/Delete action on video.
- **Description**: Soft-delete or archive a video item.
- **Response**:
  - `{ success: boolean }`

### 2.11 Upload (presigned URLs)

- **Path**: `/upload/presigned-url`
- **Method**: `POST`
- **Used by**: Artist Portal → Upload (music and video).
- **Description**: Generate presigned URLs for media upload (audio, video, images).
- **Request body**:
  - As per existing `IUploadPresignedUrlPayload` – includes `entityType`, `entityId`, `intent`, and file info.
- **Response**:
  - As per `IUploadPresignedUrlRes` – single or multiple upload URLs.
- **Populations**:
  - Not applicable (no entity documents returned).

---

## 3. Vendor Dashboard (`/account/vendor`)

> Platform scope: **no in-platform payment** and **no in-platform buyer–seller messaging**.  
> Orders are persisted on the backend and **organized and sent to the vendor’s WhatsApp number** for off-platform follow-up (e.g. via WhatsApp).

### 3.1 Become vendor

- **Path**: `/marketplace/become-vendor`
- **Method**: `POST` (public, authenticated as user)
- **Used by**: Marketplace → Become Vendor page.
- **Description**: Register the current user as a vendor and create a vendor profile.
- **Request body** (based on `IMarketplaceBecomeVendorPayload`):
  - `{ storeName: string; storeDescription?: string; email: string; phone: string; whatsapp: string; address?: string; bankAccountName?: string; bankAccountNumber?: string; bankName?: string }`
- **Response**:
  - `{ vendor: IMarketplaceVendor; message?: string }`

### 3.2 Get vendor profile (for dashboard)

- **Path**: `/vendor/me`
- **Method**: `GET`
- **Used by**: Vendor dashboard home, Vendor Settings load.
- **Description**: Retrieve the vendor profile for the currently authenticated vendor user.
- **Response**:
  - `vendor: IMarketplaceVendor & { whatsapp: string; address?: string; bankAccountName?: string; bankAccountNumber?: string; bankName?: string }`
- **Populations**:
  - None; this is the vendor document.

### 3.3 Update vendor settings

- **Path**: `/vendor/settings`
- **Method**: `PATCH`
- **Used by**: `/account/vendor/settings`
- **Description**: Update vendor profile, including **required WhatsApp number** used for order notifications.
- **Request body** (extending existing `IVendorUpdateSettingsPayload`):
  - `{ storeName?, storeDescription?, email?, phone?, logo?, coverImage?, whatsapp: string, address?, bankAccountName?, bankAccountNumber?, bankName? }`
- **Response**:
  - `vendor` (same fields as `/vendor/me`).

### 3.4 List vendor products

- **Path**: `/vendor/products`
- **Method**: `GET`
- **Used by**: `/account/vendor/products`
- **Description**: List products belonging to the current vendor, with optional status filtering.
- **Query params**:
  - `page`, `limit`
  - `status?` (e.g. `draft`, `published`, `archived`)
- **Response**:
  - `{ products: IMarketplaceProduct[]; pagination: { page, limit, total, totalPages } }`
- **Populations**:
  - None required (vendor is implicit from auth context).

### 3.5 Create product

- **Path**: `/vendor/products`
- **Method**: `POST`
- **Used by**: `/account/vendor/products/new`
- **Description**: Create a new product for the current vendor.
- **Request body** (based on `IVendorCreateProductPayload`):
  - `{ name: string; description?: string; category: ProductCategory; price: number; images?: string[]; stockQuantity?: number; isFeatured?: boolean }`
- **Response**:
  - `product: IMarketplaceProduct`

### 3.6 Update product

- **Path**: `/vendor/products/:id`
- **Method**: `PATCH`
- **Used by**: `/account/vendor/products/[id]/edit`, archive action.
- **Description**: Update an existing product (including publishing or archiving).
- **Request body** (based on `IVendorUpdateProductPayload`):
  - `{ name?, description?, category?, price?, images?, inStock?, stockQuantity?, status?, isFeatured? }`
- **Response**:
  - `product: IMarketplaceProduct`

### 3.7 List vendor orders

- **Path**: `/vendor/orders`
- **Method**: `GET`
- **Used by**: `/account/vendor/orders`
- **Description**: List orders that include products from the current vendor, with status filtering.
- **Query params**:
  - `page`, `limit`
  - `status?`
- **Response**:
  - `{ orders: PopulatedMarketplaceOrder[]; pagination: { page, limit, total, totalPages } }`
- **Populations**:
  - `orders[].customer` embedded or populated `{ name, email, phone }`
  - `orders[].items[].product` populated `{ _id, name, slug }`

### 3.8 Place order (customer side)

- **Path**: `/marketplace/orders`
- **Method**: `POST`
- **Used by**: Marketplace checkout flow that leads to WhatsApp-based follow-up.
- **Description**: Create an order for one vendor (or multiple, depending on design) and trigger WhatsApp-based order notification to that vendor.
- **Request body** (based on `IMarketplacePlaceOrderPayload`):
  - `{ customer: { name, email, phone, address? }; items: Array<{ productId: string; productName?: string; quantity: number; price: number }> }`
- **Response**:
  - `{ order: PopulatedMarketplaceOrder }`
- **Populations**:
  - `order.vendor` → `{ _id, name?, slug, storeName }`
  - `order.items[].product` → `{ _id, name, slug, image? }`
- **Side effects (required)**:
  - Persist the order in the database.
  - Enqueue a job or call an integration that **sends the order details to the vendor’s WhatsApp number** (from `/vendor/me`), including:
    - Customer contact details
    - Ordered products (name, quantity, price)
    - Order number

---

## 4. Notes

- All “Populated*” response shapes should be kept in sync with the frontend types defined in `oj-multimedia/lib/constants/endpoints.ts` (e.g. `PopulatedUser`, `PopulatedMarketplaceOrder`).
- Any additional filters, sorting options, or fields required by the dashboards should be added here and mirrored in the frontend endpoint definitions.

