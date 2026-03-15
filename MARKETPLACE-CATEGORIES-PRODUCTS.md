# Marketplace Categories, Subcategories & Products

This document describes backend models and endpoints for **marketplace categories**, **subcategories**, and **product** updates (optional category/subcategory, tags). It aligns with the `oj-multimedia` frontend and extends the existing vendor dashboard and marketplace APIs.

- All vendor endpoints are **authenticated** and require a valid vendor account unless otherwise specified.
- List endpoints for categories and subcategories are **public** (no auth) so the vendor create/edit product forms and the public marketplace can consume them.

---

## 1. Models

### 1.1 Category

Categories are admin-managed; vendors only select from the list.

| Field       | Type     | Required | Description                    |
|------------|----------|----------|--------------------------------|
| `_id`      | ObjectId | yes      | Primary key                    |
| `name`     | string   | yes      | Display name (e.g. "Fashion")  |
| `slug`     | string   | yes      | Unique URL-safe identifier     |
| `displayOrder` | number | no       | Sort order (default 0)         |
| `isActive` | boolean  | no       | If false, hidden from lists (default true) |
| `createdAt`| Date     | no       | Set on create                  |
| `updatedAt`| Date     | no       | Set on update                  |

**Indexes:** `slug` (unique), `isActive`, `displayOrder`.

### 1.2 SubCategory

Subcategories belong to a category. Vendors choose a category then optionally a subcategory.

| Field       | Type     | Required | Description                          |
|------------|----------|----------|--------------------------------------|
| `_id`      | ObjectId | yes      | Primary key                          |
| `category` | ObjectId | yes      | Reference to Category `_id`          |
| `name`     | string   | yes      | Display name (e.g. "Men")             |
| `slug`     | string   | yes      | URL-safe identifier (unique per category) |
| `displayOrder` | number | no       | Sort order (default 0)               |
| `isActive` | boolean  | no       | If false, hidden from lists (default true) |
| `createdAt`| Date     | no       | Set on create                        |
| `updatedAt`| Date     | no       | Set on update                        |

**Indexes:** `category` + `slug` (unique compound), `category`, `isActive`, `displayOrder`.

### 1.3 Product (updates)

Existing product model is extended as follows. **Category** and **subCategory** are **optional**. **Tags** are added.

| Field         | Type       | Required | Description                                    |
|---------------|------------|----------|------------------------------------------------|
| … (existing)  | …          | …        | name, slug, vendor, description, price, images, stockQuantity, status, isFeatured, displayOrder, etc. |
| `category`    | ObjectId   | **no**   | Reference to Category `_id`                    |
| `subCategory` | ObjectId   | **no**   | Reference to SubCategory `_id` (should belong to `category` when both set) |
| `tags`        | string[]   | **no**   | Vendor-defined tags for easier identification/search (e.g. `["organic", "handmade"]`) |

- Products with no `category` (and no `subCategory`) are treated as **“Other”** on the frontend: they are shown under a virtual “Others” category/subcategory for browsing and filters.
- Validation (recommended): when `subCategory` is present, backend should validate that `subCategory.category` equals `category`.

#### 1.3.1 Product response: populated category and subCategory

All product responses (create product, update product, list vendor products, list marketplace products, get product by id/slug) **must populate** the `category` and `subCategory` fields when present. Each populated value must be an object with at least:

- **category** (when set): `{ _id: string; name: string; slug: string }`
- **subCategory** (when set): `{ _id: string; name: string; slug: string; category?: string }` (category may be the parent category id or omitted)

If `category` or `subCategory` is not set (null/undefined), omit the field or return null. The frontend uses `name` and `slug` for display and for building filter URLs (e.g. `/marketplace/products?category=slug`).

---

## 2. List endpoints (public)

### 2.1 List categories

- **Path:** `GET /marketplace/categories`
- **Method:** `GET`
- **Auth:** Not required (public).
- **Description:** Returns active categories for vendor product forms and marketplace filters.

**Query (optional):**

- `includeInactive=1` — include inactive categories (e.g. for admin UIs). Default: only active.

**Response:**

```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "_id": "...",
        "name": "Fashion",
        "slug": "fashion",
        "displayOrder": 0,
        "isActive": true
      }
    ]
  }
}
```

Type: `categories: Array<{ _id: string; name: string; slug: string; displayOrder?: number; isActive?: boolean }>`.

---

### 2.2 List subcategories

- **Path:** `GET /marketplace/subcategories`
- **Method:** `GET`
- **Auth:** Not required (public).
- **Description:** Returns subcategories, optionally filtered by category.

**Query (optional):**

- `category` — Category `_id` or `slug`. When provided, only subcategories for that category are returned. When omitted, return all active subcategories (frontend may group by category).

**Response:**

```json
{
  "success": true,
  "data": {
    "subcategories": [
      {
        "_id": "...",
        "category": "...",
        "name": "Men",
        "slug": "men",
        "displayOrder": 0,
        "isActive": true
      }
    ]
  }
}
```

Type: `subcategories: Array<{ _id: string; category: string; name: string; slug: string; displayOrder?: number; isActive?: boolean }>`.

---

## 3. Vendor product endpoints

### 3.1 Create product

- **Path:** `POST /vendor/products` (or existing create-product route)
- **Method:** `POST`
- **Auth:** Required (vendor).
- **Description:** Create a new product. Category, subCategory, and tags are optional.

**Request body:**

```json
{
  "name": "Product name",
  "description": "Optional description",
  "category": "categoryId_or_null",
  "subCategory": "subCategoryId_or_null",
  "tags": ["tag1", "tag2"],
  "price": 1999,
  "images": ["https://..."],
  "stockQuantity": 10,
  "isFeatured": false
}
```

| Field          | Type     | Required | Description                                  |
|----------------|----------|----------|----------------------------------------------|
| `name`         | string   | yes      | Product name                                 |
| `description` | string   | no       | Product description                          |
| `category`     | string   | no       | Category `_id`                               |
| `subCategory`  | string   | no       | SubCategory `_id` (should belong to category) |
| `tags`         | string[] | no       | Array of tag strings                         |
| `price`        | number   | yes      | Price (format as per existing API)           |
| `images`       | string[] | no       | URLs (e.g. from presigned uploads)            |
| `stockQuantity`| number   | no       | Stock quantity                               |
| `isFeatured`   | boolean  | no       | Featured flag                                |

**Response:** Product document including `category`, `subCategory`, and `tags`. **Category and subCategory must be populated** with at least `{ _id, name, slug }` (see §1.3.1).

---

### 3.2 Update product

- **Path:** `PATCH /vendor/products/:productId` (or existing update-product route)
- **Method:** `PATCH`
- **Auth:** Required (vendor); product must belong to the vendor.
- **Description:** Update product fields. All body fields optional.

**Request body (all optional):**

```json
{
  "name": "New name",
  "description": "Updated description",
  "category": "categoryId_or_null",
  "subCategory": "subCategoryId_or_null",
  "tags": ["updated", "tags"],
  "price": 2499,
  "images": ["https://..."],
  "stockQuantity": 5,
  "status": "published",
  "isFeatured": true
}
```

- `category` / `subCategory`: pass `null` or omit to clear; when `subCategory` is set, validate it belongs to `category`.
- `tags`: replace with the new array.

**Response:** Updated product document (same shape as create response; category and subCategory populated per §1.3.1).

---

## 4. Image upload (product images)

For vendor product images, the **presigned URL** (or equivalent upload) request should use:

- **entityType:** `vendor`
- **entityId:** the vendor’s `_id`

So uploads are scoped to the vendor entity (e.g. folder `vendor/:vendorId/...`). The backend must allow `entityType === 'vendor'` for the **client** presigned-url endpoint and ensure the authenticated user is the owner of that vendor (e.g. `req.user.vendorId === entityId` or equivalent). After upload, the returned URL is sent in the product’s `images` array on create/update.

---

## 5. Frontend display rule

- Products with **no** `category` (and no `subCategory`) are shown in the marketplace and vendor UIs as belonging to a virtual **“Others”** category and, if the UI uses subcategories, **“Others”** subcategory. No backend change required; this is a frontend convention.

---

## 6. Summary

| Item                    | Description                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| **Category model**      | name, slug, displayOrder, isActive; admin-managed.                          |
| **SubCategory model**   | category (ref), name, slug, displayOrder, isActive.                        |
| **Product updates**     | Optional `category`, optional `subCategory`, optional `tags` (string[]).    |
| **Product responses**   | Always populate `category` and `subCategory` with at least `{ _id, name, slug }`. |
| **List categories**     | `GET /marketplace/categories` (public).                                     |
| **List subcategories**  | `GET /marketplace/subcategories?category=...` (public).                      |
| **Create product**      | `POST /vendor/products` with optional category, subCategory, tags.         |
| **Update product**      | `PATCH /vendor/products/:id` with optional category, subCategory, tags.      |
| **Product image upload**| Presigned URL with `entityType: 'vendor'`, `entityId: vendor._id`.         |
| **Uncategorized products** | Shown as “Others” category/subcategory on the frontend.                 |
