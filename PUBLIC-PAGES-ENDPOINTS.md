# Public Pages API Endpoints Specification

This document defines the API endpoints required by the frontend (oj-multimedia) for the public **Music**, **Videos**, and **News** pages. Implement these endpoints so the frontend can consume live data.

**Backend must:** Follow the response shapes, query parameter semantics, and key names below exactly so the frontend can parse responses without conditional logic or guesswork.

---

## Overview of all endpoints

| # | Method | Path (base) | Purpose | List key in response | Detail key |
|---|--------|-------------|---------|------------------------|------------|
| 1.1 | GET | `/public/music` | List music (trending, recent, charts, etc.) | `music` | — |
| 1.2 | GET | `/public/music/:idOrSlug` | Single music item by id or slug | — | `music` |
| 2.1 | GET | `/public/videos` | List videos (trending, featured, recent, short-form) | `videos` | — |
| 2.2 | GET | `/public/videos/:idOrSlug` | Single video by id or slug | — | `video` |
| 3.1 | GET | `/public/news` | List news (featured, trending, latest, video) | `articles` | — |
| 3.2 | GET | `/public/news/:idOrSlug` | Single news article by id or slug | — | `article` |

**Response rules (all list endpoints):**

- Shape: `{ [listKey]: T[], pagination: { page: number; limit: number; total: number; totalPages: number } }`.
- `page`: 1-based. `total`: total number of items matching the query. `totalPages`: `Math.ceil(total / limit)`.
- If no items match, return `[]` for the list and `total: 0`, not an error.

**Detail endpoints:**

- Return a single object keyed by the resource name (e.g. `{ music: MusicDetail }`). Return **404** when no document matches `idOrSlug`.

**IdOrSlug (all detail routes):**

- Backend must accept **either** a valid MongoDB ObjectId **or** a slug string. Resolve by trying ObjectId first, then slug (or vice versa); return 404 only if neither matches.

**Query parameters quick reference (list endpoints only):**

| Endpoint | Query params | Notes |
|---------|----------------|-------|
| GET `/public/music` | `category`, `page`, `limit`, `status`, `type`, `period` | `type`: `trending` \| `featured` \| `recent` \| `charts`. `period` only when `type=charts`: `weekly` \| `monthly` \| `alltime`. |
| GET `/public/videos` | `category`, `page`, `limit`, `status`, `type` | `type`: `trending` \| `featured` \| `recent` \| `short-form`. |
| GET `/public/news` | `category`, `page`, `limit`, `status`, `type` | `type`: `featured` \| `trending` \| `latest` \| `video`. |

Detail endpoints (1.2, 2.2, 3.2) use only the path param `:idOrSlug`; no query params required.

---

## 1. Music (Public)

### 1.1 List music

**Purpose:** Power main music page, trending, recent, and top-charts sub-pages. Filter/sort via query params.

| Field | Value |
|-------|--------|
| **Method** | GET |
| **Path** | `/public/music` or `/music` |
| **Auth** | Not required (public) |

**Query parameters (detailed):**

| Param | Type | Required | Default if omitted | Valid values / behavior |
|-------|------|----------|---------------------|--------------------------|
| `category` | string | No | No category filter (return all categories). | Any category slug (e.g. `gospel`, `afrobeats`, `hiphop`). If value is `all` or empty/omitted, **do not** filter by category. |
| `page` | number | No | `1` | Positive integer. 1-based. Backend must return the Nth page of results for the current query. |
| `limit` | number | No | `12` | Positive integer. Max items per page. Backend may enforce a cap (e.g. max 100). |
| `status` | string | No | Backend decides (recommended: only published for public). | Frontend always sends `published`. Backend must return **only** documents with `status === 'published'` when this param is present. |
| `type` | string | No | General list (no specific ordering/variant). | One of: `trending` \| `featured` \| `recent` \| `charts`. See table below. Invalid values: treat as "general list" or return 400 with clear message. |
| `period` | string | No | `weekly` | Used **only** when `type=charts`. One of: `weekly` \| `monthly` \| `alltime`. Ignore when `type` is not `charts`. |

**Query type semantics (what each `type` returns):**

| `type` | Description | Expected data / ordering |
|--------|--------------|---------------------------|
| `trending` | Music gaining traction (plays, engagement). | Same `MusicListItem[]` shape; ordered by whatever "trending" metric the backend uses (e.g. plays in last 7 days, velocity). |
| `recent` | Newest uploads first. | Same `MusicListItem[]` shape; ordered by `createdAt` (or equivalent) descending. |
| `charts` | Ranked by chart position for the given `period`. | Same `MusicListItem[]` shape; ordered by chart position/rank. Each item should include `chartPosition` or `rank`; optional `trend` (`up` \| `down` \| `same`) if supported. |
| `featured` | Editorially or algorithmically featured. | Same `MusicListItem[]` shape; subset marked or selected as featured. Omit `type` for a general/main list. |

**Response:** `GetListRes<MusicListItem, 'music'>`

```ts
{
  music: MusicListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

**MusicListItem** (each element of `music`):

- Backend model fields (e.g. `_id`, `title`, `slug`, `coverImage`, `views`, `category`, `createdAt`, etc.).
- **Population:** `artist` must be populated to `{ _id, name, slug, image? }` (or equivalent summary).
- **Frontend mapping:** `coverImage` → `cover`, `views` → `plays`. Optional `duration` if available (e.g. from metadata or stored field).

For `type=charts`, items should be ordered by chart position/rank; include `chartPosition` or `rank` and optional `trend` (e.g. `up` \| `down` \| `same`) if supported.

**Backend implementation notes (1.1):**

- Response key for the array **must** be `music` (frontend expects `response.music`).
- Every item in `music` must include populated `artist`: either an object `{ _id, name, slug, image? }` or (if unpopulated) the raw id string; frontend accepts `string | PopulatedArtistSummary`.
- Apply filters in this order: `status` (published) → `category` (if not all/omitted) → `type` (ordering/variant) → then paginate with `page` and `limit`.
- `pagination.total` must be the total count of items matching the filters **before** pagination; `pagination.totalPages = ceil(total / limit)`.

---

### 1.2 Get single music (detail)

**Purpose:** Music detail page by id or slug.

| Field | Value |
|-------|--------|
| **Method** | GET |
| **Path** | `/public/music/:idOrSlug` or `/music/:idOrSlug` |
| **Auth** | Not required |

**Path parameters:**

- `idOrSlug`: **Required.** Either a valid MongoDB ObjectId (24-char hex) or a slug string. Backend must resolve by id first, then by slug; return **404** if neither matches. Do not return 500 for "not found".

**Response:** `{ music: MusicDetail }`

- **MusicDetail:** Full music document with `artist` populated (e.g. `name`, `slug`, `bio`, `image`, `socials`). 404 if not found.
- **Frontend mapping:** `coverImage` → `cover`, `views` → `plays`.

**Backend implementation notes (1.2):**

- Response key **must** be `music` (singular). Return exactly one object.
- For public detail, only return the document if it is published (or if your business rules allow draft by id); otherwise 404.

---

## 2. Videos (Public)

### 2.1 List videos

**Purpose:** Main videos page and sub-pages: trending, featured, recent, short-form.

| Field | Value |
|-------|--------|
| **Method** | GET |
| **Path** | `/public/videos` or `/videos` |
| **Auth** | Not required |

**Query parameters (detailed):**

| Param | Type | Required | Default if omitted | Valid values / behavior |
|-------|------|----------|---------------------|--------------------------|
| `category` | string | No | No category filter. | Any category slug. If `all` or empty/omitted, do not filter by category. |
| `page` | number | No | `1` | Positive integer, 1-based. |
| `limit` | number | No | `12` | Positive integer; backend may cap (e.g. max 100). |
| `status` | string | No | Backend decides (recommended: only published). | Frontend sends `published`; return only documents with `status === 'published'`. |
| `type` | string | No | General list. | One of: `trending` \| `featured` \| `recent` \| `short-form`. Invalid: treat as general list or 400. |

**Query type semantics (what each `type` returns):**

| `type` | Description | Expected data / ordering |
|--------|--------------|---------------------------|
| `trending` | Videos gaining traction (views, engagement). | Same `VideoListItem[]` shape; ordered by trending metric (e.g. views in period). |
| `featured` | Editorially or algorithmically featured. | Same `VideoListItem[]` shape; featured subset. |
| `recent` | Newest uploads first. | Same `VideoListItem[]` shape; ordered by `createdAt` descending. |
| `short-form` | Short-form / clip content. | Same `VideoListItem[]` shape; filtered and optionally ordered (e.g. by duration or recency). |

**Response:** `GetListRes<VideoListItem, 'videos'>`

```ts
{
  videos: VideoListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

**VideoListItem:**

- Backend model fields (e.g. `_id`, `title`, `slug`, `thumbnail`, `duration`, `views`, `category`, `createdAt`, etc.).
- **Population:** `artist` or `creator` populated to `{ _id, name, slug, image? }`.
- **Frontend mapping:** `artist` can be exposed as `creator`; `createdAt` → `uploadedAt` if needed.

**Backend implementation notes (2.1):**

- Response key for the array **must** be `videos`. Apply filters: `status` → `category` → `type` (ordering/variant) → paginate. `pagination.total` = total matching count before pagination.

---

### 2.2 Get single video (detail)

**Purpose:** Video detail page by id or slug.

| Field | Value |
|-------|--------|
| **Method** | GET |
| **Path** | `/public/videos/:idOrSlug` or `/videos/:idOrSlug` |
| **Auth** | Not required |

**Path parameters:**

- `idOrSlug`: **Required.** MongoDB ObjectId or slug. Resolve by id then slug; return **404** if not found.

**Response:** `{ video: VideoDetail }`

- **VideoDetail:** Full video document with creator/artist populated. 404 if not found.

**Backend implementation notes (2.2):** Response key **must** be `video` (singular). Only return if published (or per your rules).

---

## 3. News (Public)

### 3.1 List news articles

**Purpose:** Main news page and sub-pages: featured, trending, latest feed, video stories.

| Field | Value |
|-------|--------|
| **Method** | GET |
| **Path** | `/public/news` or `/news` or `/news-articles` |
| **Auth** | Not required |

**Query parameters (detailed):**

| Param | Type | Required | Default if omitted | Valid values / behavior |
|-------|------|----------|---------------------|--------------------------|
| `category` | string | No | No category filter. | Any category slug; `all` or omitted = no filter. |
| `page` | number | No | `1` | Positive integer, 1-based. |
| `limit` | number | No | `12` | Positive integer; backend may cap. |
| `status` | string | No | Backend decides (recommended: only published). | Frontend sends `published`; return only `status === 'published'`. |
| `type` | string | No | General list. | One of: `featured` \| `trending` \| `latest` \| `video`. Invalid: general list or 400. |

**Query type semantics (what each `type` returns):**

| `type` | Description | Expected data / ordering |
|--------|--------------|---------------------------|
| `featured` | Editorially featured stories. | Same `NewsListItem[]` shape; featured subset. |
| `trending` | Stories gaining traction (views, engagement). | Same `NewsListItem[]` shape; ordered by trending metric. |
| `latest` | Newest articles first (feed). | Same `NewsListItem[]` shape; ordered by `createdAt` descending. |
| `video` | Video/news or video-story content. | Same `NewsListItem[]` shape; filtered to video stories. |

**Response:** `GetListRes<NewsListItem, 'articles'>` — the list key **must** be `articles` (frontend expects `response.articles`).

```ts
{
  articles: NewsListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

**NewsListItem:**

- `_id`, `title`, `slug`, `excerpt`, `category`, `coverImage`, `author`, `views`, `createdAt`. Optional: `readTime`, `comments` if backend supports.
- **Frontend mapping:** `coverImage` → `image`.

**Backend implementation notes (3.1):**

- Response key for the array **must** be `articles` (frontend reads `response.articles`).
- Apply filters: `status` → `category` → `type` → paginate. `pagination.total` = total matching count before pagination.

---

### 3.2 Get single news article (story detail)

**Purpose:** News story detail page by id or slug.

| Field | Value |
|-------|--------|
| **Method** | GET |
| **Path** | `/public/news/:idOrSlug` or `/news/:idOrSlug` or `/news-articles/:idOrSlug` |
| **Auth** | Not required |

**Path parameters:**

- `idOrSlug`: **Required.** MongoDB ObjectId or slug. Resolve by id then slug; return **404** if not found.

**Response:** `{ article: NewsDetail }` — the detail key **must** be `article` (frontend expects `response.article`).

- **NewsDetail:** Full article document (including `content`). 404 if not found.
- **Frontend mapping:** `coverImage` → `image`.

**Backend implementation notes (3.2):** Only return if published (or per your rules).

---

## 4. Payload types

No POST/PUT/PATCH payloads are required for these public read-only endpoints.

---

## 5. Consistency and contract summary

- **List shape:** All list responses use the same `pagination` object and a single array key (`music`, `videos`, or `news`/`articles`) for the items. No extra wrapper keys.
- **Ids:** Frontend detail routes use `[id]` in the path; backend **must** accept both ObjectId and slug and return 404 when not found.
- **Populations:** List and detail responses must populate `artist` (music/videos) and any author/creator fields so the frontend does not need extra requests.
- **News keys:** List response key must be `articles`; detail response key must be `article`. Frontend expects these exactly.

---

## 6. Common pitfalls (avoid these on the backend)

| Pitfall | Correct behavior |
|--------|--------------------|
| Returning a different list key (e.g. `items` instead of `music`) | Use exactly `music`, `videos`, or `articles` as specified. Frontend reads `response.music`, `response.videos`, `response.articles`. |
| Ignoring `status=published` | When the frontend sends `status=published`, filter so only published documents are returned. |
| Treating `category=all` or missing category as "filter by category 'all'" | Treat `all` or omitted category as **no category filter** (return all categories). |
| Using `period` when `type` is not `charts` | Ignore `period` unless `type=charts`. For music, `period` applies only to charts. |
| Returning 500 for "document not found" on detail | Return **404** when no document matches `idOrSlug`. |
| Wrong response keys for news | List must use key `articles`; detail must use key `article`. Frontend is hardcoded to these. |
| Wrong pagination total | `pagination.total` = total number of items matching the query **before** applying `page`/`limit`. `totalPages = ceil(total / limit)`. |
| Unpopulated `artist` / `creator` in list items | Always populate `artist` (or `creator`) to `{ _id, name, slug, image? }` so the frontend can display names and links without a second request. |
