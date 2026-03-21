# Promotion Content API — Models, Types & Endpoints (for oj-backend)

This document specifies the new models, types, and public endpoints required to serve dynamic promotion content for the **oj-multimedia** frontend. Currently, featured options, pricing options, download categories, and contact/sponsorship content are hardcoded in the frontend. These should be stored in the database and served via API.

**Base URL:** `{API_BASE}/public`  
Example: `GET /public/featured-options`, `GET /public/resource-download-categories`, etc.

All success responses follow the standard wrapper:

```ts
{
  success: true,
  message: string;
  responseCode: number;
  data: { ... };  // payload below
}
```

---

## 1. Models to Create

### 1.1 FeaturedOption

For the "Get Featured and Boost Your Visibility" section (homepage slider, trending section, social media promo).

| Field        | Type     | Required | Description                                      |
|-------------|----------|----------|--------------------------------------------------|
| title       | String   | yes      | e.g. "Homepage Slider Banner"                    |
| duration    | String   | yes      | e.g. "1 Week", "Flexible"                         |
| price       | String   | yes      | e.g. "₦10,000", "₦5,000 - ₦10,000"              |
| description | String   | yes      | Short description                                |
| features    | [String] | yes      | Array of feature bullets                         |
| icon        | String   | yes      | Icon identifier: `home`, `trending-up`, `mail`, `star`, `music`, `video`, `megaphone` |
| displayOrder| Number   | no       | Sort order (default 0)                           |
| isActive    | Boolean  | no       | Default true; filter inactive in public list       |

**Collection:** `featuredoptions`

### 1.2 PromotionPricingOption

For the "Promote Your Song" section (Basic Listing, Featured Song, Artist Spotlight).

| Field        | Type     | Required | Description                                      |
|-------------|----------|----------|--------------------------------------------------|
| title       | String   | yes      | e.g. "Basic Listing"                             |
| price       | String   | yes      | e.g. "₦5,000"                                    |
| description | String   | yes      | Short description                                |
| features    | [String] | yes      | Array of feature bullets                         |
| isFeatured  | Boolean  | no       | When true, show "Most Popular" badge (default false) |
| displayOrder| Number   | no       | Sort order (default 0)                           |
| isActive    | Boolean  | no       | Default true; filter inactive in public list      |

**Collection:** `promotionpricingoptions`

### 1.3 ResourceDownloadCategory

For the "Free Downloads" section (Free E-books, Sermon Templates, Free Beats, Wallpapers). These are display categories that may link to resource types or specific routes.

| Field        | Type   | Required | Description                                      |
|-------------|--------|----------|--------------------------------------------------|
| title       | String | yes      | e.g. "Free E-books"                               |
| count       | String | yes      | Display string, e.g. "12+", "50+" (can be computed from Resource counts or overridden) |
| description | String | yes      | Short description                                |
| icon        | String | yes      | Emoji or icon identifier, e.g. "📚", "📄", "🎵", "🖼️" |
| href        | String | yes      | Link href (relative or absolute), e.g. "#free-ebooks", "/community/resources" |
| displayOrder| Number | no       | Sort order (default 0)                           |
| isActive    | Boolean| no       | Default true; filter inactive in public list     |

**Collection:** `resourcedownloadcategories`

### 1.4 ContactMethod

For the "Contact for Sponsorship / Partnership" section (Email, Phone, WhatsApp).

| Field        | Type   | Required | Description                                      |
|-------------|--------|----------|--------------------------------------------------|
| method      | String | yes      | e.g. "Email", "Phone", "WhatsApp"                |
| value       | String | yes      | Display value, e.g. "ohemultimedia@gmail.com"    |
| action      | String | yes      | `mailto:...`, `tel:...`, or `https://wa.me/...`  |
| icon        | String | yes      | Icon identifier: `mail`, `phone`, `message-square`, `whatsapp` |
| displayOrder| Number | no       | Sort order (default 0)                           |
| isActive    | Boolean| no       | Default true; filter inactive in public list     |

**Collection:** `contactmethods`

### 1.5 PartnershipBenefit

For the "Partnership Benefits" list in the Contact Sponsorship section.

| Field        | Type   | Required | Description                                      |
|-------------|--------|----------|--------------------------------------------------|
| text        | String | yes      | Benefit text                                     |
| displayOrder| Number | no       | Sort order (default 0)                           |
| isActive    | Boolean| no       | Default true; filter inactive in public list     |

**Collection:** `partnershipbenefits`

### 1.6 PromotionContactConfig (Optional — Single Document)

Alternatively, contact methods and partnership benefits can be stored in a single config document (similar to SiteSettings), with `contactMethods` and `partnershipBenefits` as embedded arrays. If using this approach, one endpoint `GET /public/promotion-contact` returns the combined config.

---

## 2. Endpoints to Create

All endpoints are **public** (no auth required) and return only `isActive: true` items, sorted by `displayOrder` ascending.

### 2.1 GET /public/featured-options

**Response data shape:**

```ts
{
  featuredOptions: Array<{
    _id: string;
    title: string;
    duration: string;
    price: string;
    description: string;
    features: string[];
    icon: string;
    displayOrder?: number;
  }>;
}
```

### 2.2 GET /public/promotion-pricing-options

**Response data shape:**

```ts
{
  pricingOptions: Array<{
    _id: string;
    title: string;
    price: string;
    description: string;
    features: string[];
    isFeatured?: boolean;
    displayOrder?: number;
  }>;
}
```

### 2.3 GET /public/resource-download-categories

**Response data shape:**

```ts
{
  downloadCategories: Array<{
    _id: string;
    title: string;
    count: string;
    description: string;
    icon: string;
    href: string;
    displayOrder?: number;
  }>;
}
```

**Note:** The `count` field can be:
- Stored statically in the model (e.g. "12+")
- Or computed from `Resource.countDocuments({ type: 'ebook', status: 'published' })` and similar, then formatted (e.g. `"12+"`). If computed, the backend may need a mapping from category to resource type.

### 2.4 GET /public/promotion-contact

**Response data shape:**

```ts
{
  contactMethods: Array<{
    _id: string;
    method: string;
    value: string;
    action: string;
    icon: string;
    displayOrder?: number;
  }>;
  partnershipBenefits: string[];
  additionalContact?: string;  // e.g. "+234 707 324 4801"
}
```

---

## 3. Route Registration

Register these routes under the public prefix (e.g. in `public.route.ts` or equivalent):

```ts
// In public route registration (prefix: /public)
app.get('/featured-options', catchAsync(listFeaturedOptions));
app.get('/promotion-pricing-options', catchAsync(listPromotionPricingOptions));
app.get('/resource-download-categories', catchAsync(listResourceDownloadCategories));
app.get('/promotion-contact', catchAsync(getPromotionContact));
```

---

## 4. Admin Endpoints (Optional)

For managing this content via admin dashboard, add CRUD endpoints under `/admin`:

- `GET /admin/featured-options` — list (with pagination)
- `POST /admin/featured-options` — create
- `PATCH /admin/featured-options/:id` — update
- `DELETE /admin/featured-options/:id` — delete (or soft delete via isActive)

Repeat for `promotion-pricing-options`, `resource-download-categories`, `contact-methods`, `partnership-benefits` (or `promotion-contact` if using single config).

---

## 5. Seed Data

Seed the following default data so the frontend displays content before admin customization:

**FeaturedOption:**
- Homepage Slider Banner — ₦10,000 — 1 Week — icon: home
- Trending Section — ₦8,000 — 1 Week — icon: trending-up
- Social Media Promo — ₦5,000 - ₦10,000 — Flexible — icon: mail

**PromotionPricingOption:**
- Basic Listing — ₦5,000 — isFeatured: false
- Featured Song — ₦8,000 — isFeatured: true (Most Popular)
- Artist Spotlight — ₦7,000 — isFeatured: false

**ResourceDownloadCategory:**
- Free E-books — 12+ — #free-ebooks — 📚
- Sermon Templates — 25+ — /community/resources — 📄
- Free Beats — 50+ — #free-beats — 🎵
- Wallpapers — 100+ — #wallpapers — 🖼️

**ContactMethod:**
- Email — ohemultimedia@gmail.com — mailto:ohemultimedia@gmail.com — mail
- Phone — +234 705 692 3436 — tel:+2347056923436 — phone
- WhatsApp — +234 913 667 0466 — https://wa.me/2349136670466 — message-square

**PartnershipBenefit:**
- Long-term sponsorship opportunities
- Custom advertising solutions
- Brand visibility across all platforms
- Dedicated account manager
- Performance tracking and reports
- Flexible pricing and payment options

**PromotionContactConfig (if using single doc):**
- additionalContact: "+234 707 324 4801"

---

## 6. Frontend Usage

The oj-multimedia frontend will:

1. Call these endpoints from the promote-your-content page and resources page (server-side via `callServerApi`).
2. Pass the fetched data as props to `GetFeatured`, `PromoteYourSong`, `FreeDownloads`, and `ContactSponsorship` components.
3. Map `icon` strings to Lucide icon components (e.g. `home` → `Home`, `trending-up` → `TrendingUp`).
4. Fall back to hardcoded defaults if the API returns empty or errors (optional, for resilience).
