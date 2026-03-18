# Contact & Search API — Types and Endpoints (for oj-multimedia)

This document describes the API contract for the **Contact** and **Search** pages and their components so the frontend (oj-multimedia) can type requests and parse responses consistently.

**Base URL for public endpoints:** `{API_BASE}/public`  
Example: `POST /public/contact`, `GET /public/search?q=...`

All success responses follow the same wrapper as other public APIs:

```ts
{
  success: true,
  message: string;
  responseCode: number;
  data: { ... };  // payload below
}
```

Error responses: `{ success: false, message: string, responseCode: number, data?: unknown }` with status 400, 404, 409, etc.

---

## 1. Contact

### 1.1 Contact page data (site settings)

The contact page needs **contact info** and **socials** for display (address, phone, email, office hours, map link, social links). These are provided by the existing **Site Settings** API (no new endpoint).

**Expected request (GET):**

- **Path:** `/site-settings/:slice` where `:slice` is one of:
  - `contactInfo` — returns the contact info object (address, tel, email, officeHours, locationUrl, etc.).
  - `socials` — returns the social links array.
- No query parameters. No auth required (public).
- Alternatively the frontend may call **GET** `/site-settings` (no path segment) for all settings; the doc below describes the slice-based usage.

**Response `data` shape (contactInfo slice):**

```ts
export interface ContactInfo {
  address: string[];
  tel: string[];
  email: string[];
  whatsapp?: string;
  locationUrl?: string;
  officeHours?: OfficeHours;
}

export interface OfficeHours {
  monday?: { start: string | null; end: string | null };
  tuesday?: { start: string | null; end: string | null };
  wednesday?: { start: string | null; end: string | null };
  thursday?: { start: string | null; end: string | null };
  friday?: { start: string | null; end: string | null };
  saturday?: { start: string | null; end: string | null };
  sunday?: { start: string | null; end: string | null };
}
```

**Response `data` shape (socials slice):**

```ts
export interface Social {
  platform: string;  // e.g. 'facebook' | 'instagram' | 'twitter' | 'youtube' | 'website'
  href: string;
}
// data = { socials: Social[] } or array at root depending on slice response
```

Populations: none (flat structure).

---

### 1.2 Submit contact form

Public endpoint for submitting the contact form (name, phone, optional email, subject, message). Backend validates, persists to ContactSubmission, and may send email to configured admin/reply-to (e.g. via queue).

| Method | Path | Auth | Request body | Response `data` |
|--------|------|------|--------------|------------------|
| POST   | `/public/contact` | No | See below | See below |

**Expected request body (POST /public/contact):**

Send as JSON in the request body (no query params). `name`, `phone`, `subject`, and `message` are required; `email` is optional.

```ts
export interface SubmitContactPayload {
  name: string;    // required, max e.g. 200
  phone: string;   // required, max e.g. 50
  email?: string;  // optional, valid email if provided, max 320
  subject: string; // required, max e.g. 200
  message: string; // required, min 10, max e.g. 5000
}
```

**Response `data` (201):**

```ts
export interface SubmitContactRes {
  message: string;  // e.g. "Thank you for your message. We'll get back to you soon."
  contactSubmission: {
    _id: string;
    createdAt: string;  // ISO date
  };
}
```

Validations: `name` required, max 200; `phone` required, max 50; `email` optional, valid format if provided, max 320; `subject` required, max 200; `message` required, min 10, max 5000.

Populations: none.

---

## 2. Search

Unified search across public content: music, videos, news, devotionals, testimonies, prayer requests, ask-a-pastor questions, polls, artists, resources.

| Method | Path | Auth | Query params | Response `data` |
|--------|------|------|--------------|------------------|
| GET    | `/public/search` | No | See below | See below |

### 2.1 Expected query parameters (GET /public/search)

All query parameters are optional in the URL; the backend applies defaults when omitted. The frontend should send requests with a query string built from the following.

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `q` | string | **Yes** (for results) | — | Search term. If empty or missing, the backend returns `{ results: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } }` (no error). |
| `type` | string | No | (all types) | Restrict results to a single content type or the special value `community`. See **Note: `type` values** below. |
| `page` | string (number) | No | `"1"` | 1-based page index. Parsed as integer; invalid values fall back to 1. |
| `limit` | string (number) | No | `"24"` | Page size. Clamped to backend max (e.g. 50). Invalid values fall back to default. |

**Note: `type` values**

- Omit `type` or send empty to search **all** content types.
- Single content types: `music`, `news`, `video`, `devotional`, `testimony`, `prayer-request`, `question`, `poll`, `resource`, `artist`.
- **`community`**: special value. Backend expands this to all community content types (devotional, testimony, prayer-request, question, poll, resource, artist). Use this when the UI filter is “Community” so one param covers all community collections.

**Example query strings**

- All types, first page: `?q=faith&page=1&limit=24`
- Music only: `?q=faith&type=music`
- Community only: `?q=faith&type=community`
- Page 2: `?q=faith&type=video&page=2&limit=24`

**Response `data` shape:**

```ts
export type SearchResultType =
  | 'music'
  | 'news'
  | 'video'
  | 'devotional'
  | 'testimony'
  | 'prayer-request'
  | 'question'
  | 'poll'
  | 'resource'
  | 'artist';

export interface SearchResultItem {
  _id: string;
  title: string;
  subtitle: string;
  type: SearchResultType;
  image?: string;
  meta: string;
}

export interface SearchListData {
  results: SearchResultItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**Populations / field mapping (backend responsibility):**

- **music**: `title` = title, `subtitle` = artist name (populate artist if needed), `type` = `'music'`, `image` = coverImage, `meta` = plays or duration.
- **news**: `title` = title, `subtitle` = category, `type` = `'news'`, `image` = image, `meta` = readTime.
- **video**: `title` = title, `subtitle` = artist/creator, `type` = `'video'`, `image` = thumbnail, `meta` = duration or views.
- **devotional**: `title` = title, `subtitle` = category/author, `type` = `'devotional'`, `image` = optional, `meta` = readingTime or date.
- **testimony**: `title` = title or content excerpt, `subtitle` = author, `type` = `'testimony'`, `image` = avatar, `meta` = category.
- **prayer-request**: `title` = title, `subtitle` = author, `type` = `'prayer-request'`, `image` = optional, `meta` = category.
- **question**: `title` = question text, `subtitle` = author, `type` = `'question'`, `image` = optional, `meta` = category.
- **poll**: `title` = question, `subtitle` = category, `type` = `'poll'`, `image` = optional, `meta` = e.g. "X votes".
- **resource**: `title` = title, `subtitle` = category/type, `type` = `'resource'`, `image` = cover/image, `meta` = downloads or type.
- **artist**: `title` = name, `subtitle` = genre, `type` = `'artist'`, `image` = image, `meta` = e.g. followers or songs count.

Backend should normalize `_id` to string and ensure each item has a stable `type` so the frontend can build detail URLs (e.g. `/music/:id`, `/community/devotionals/:id`).

---

## 3. Path summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/site-settings/contactInfo` | Contact info for contact page (existing) |
| GET | `/site-settings/socials` | Social links for contact page (existing) |
| POST | `/public/contact` | Submit contact form |
| GET | `/public/search?q=...&type=...&page=...&limit=...` | Unified search |

---

## 4. Frontend usage

- **Contact page**: Server-fetch `contactInfo` and `socials` (via existing site-settings endpoint or a single combined call), pass to RSC/client. Form submit → `POST /public/contact` with loading and error handling.
- **Search page**: URL state with nuqs (`q`, `type`, and optionally `page`, `limit`). Server component reads `searchParams`, calls `GET /public/search` with that query string, passes results to client. **Filters are server-driven:** changing the filter tab updates the `type` param (after a 500ms debounce), which triggers a new server request; there is no client-side filtering. Loading: Suspense + skeleton. Empty: no results message. Error: inline error state.

---

## 5. Backend implementation (oj-backend)

- **POST /public/contact**: Implemented in `src/controllers/public/contact.controller.ts`. Validates body via `contact.validation.ts`. Returns 201 with `{ message }`. Optional: add ContactSubmission model and/or email queue.
- **GET /public/search**: Implemented in `src/controllers/public/search.controller.ts`. Queries Music, Video, NewsArticle, Devotional, Testimony, PrayerRequest, AskPastorQuestion, Poll, Artist, Resource with `q` regex; optional `type` filter; `page`/`limit` for pagination. Returns `{ results, pagination }` with normalized `SearchResultItem[]`.
