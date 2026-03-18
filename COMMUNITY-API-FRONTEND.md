# Community API — Types, Constants & Endpoints (for oj-multimedia)

This document is intended for the **oj-multimedia** frontend. It describes the Community API types, constants, and endpoint contract (paths, payloads, response shapes) so the frontend can type requests and parse responses consistently.

**Base URL for community endpoints:** `{API_BASE}/public`  
Example: `GET /public/community`, `GET /public/devotionals`, etc.

All success responses are wrapped as:

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

## 1. Constants (enums)

Use these for query params and request bodies.

```ts
// Devotionals list type
export const DEVOTIONAL_TYPES = [
  'daily',
  'latest',
  'popular',
  'bible-study',
  'prayer-points',
  'living-tips',
  'marriage-family',
] as const;
export type DevotionalType = (typeof DEVOTIONAL_TYPES)[number];

// Testimonies list type
export const TESTIMONY_TYPES = ['all', 'featured', 'latest'] as const;
export type TestimonyType = (typeof TESTIMONY_TYPES)[number];

// Prayer requests & Ask-a-pastor questions status
export const PRAYER_STATUS = ['active', 'answered'] as const;
export type PrayerStatus = (typeof PRAYER_STATUS)[number];

// Polls status
export const POLL_STATUS = ['active', 'closed'] as const;
export type PollStatus = (typeof POLL_STATUS)[number];

// Resources list type
export const RESOURCE_TYPES = ['ebook', 'template', 'beat', 'wallpaper', 'affiliate'] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];
```

---

## 2. Types (response shapes)

### Pagination (all list endpoints)

```ts
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### Community hub

```ts
export interface CommunityHubData {
  categoryCounts: Record<string, number>;
  featuredTestimonies?: TestimonyListItem[];
  trendingDevotionals?: DevotionalListItem[];
  activeDiscussions?: unknown[];
}
```

### Devotionals

```ts
export interface DevotionalListItem {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  author?: string;
  views?: number;
  createdAt?: string;
  type?: string;
  verse?: string;
  date?: string;
  readingTime?: number;
  lessons?: string[];
  duration?: number;
}

export interface DevotionalDetail extends DevotionalListItem {
  content?: string;
  updatedAt?: string;
}

export interface DevotionalsListData {
  devotionals: DevotionalListItem[];
  pagination: Pagination;
}

export interface DevotionalDetailData {
  devotional: DevotionalDetail;
  relatedDevotionals?: DevotionalListItem[];
}
```

### Testimonies

```ts
export interface TestimonyListItem {
  _id: string;
  author: string;
  avatar?: string;
  content: string;
  likes: number;
  comments: number;
  timeAgo: string;
  category?: string;
}

export interface TestimonyDetail extends TestimonyListItem {
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestimoniesListData {
  testimonies: TestimonyListItem[];
  pagination: Pagination;
}

export interface TestimonyDetailData {
  testimony: TestimonyDetail;
}
```

### Prayer requests

```ts
export interface PrayerRequestListItem {
  _id: string;
  title: string;
  content: string;
  author: string;
  category?: string;
  prayers: number;
  comments: number;
  timeAgo: string;
  urgent: boolean;
  testimony?: string;
  answeredDate?: string;
}

export interface PrayerRequestDetail extends PrayerRequestListItem {
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrayerRequestsListData {
  prayerRequests: PrayerRequestListItem[];
  pagination: Pagination;
}

export interface PrayerRequestDetailData {
  prayerRequest: PrayerRequestDetail;
}
```

### Ask a pastor (questions & pastors)

```ts
export interface PastorListItem {
  _id: string;
  name: string;
  title?: string;
  church?: string;
  image?: string;
  expertise?: string[];
  questionsAnswered?: number;
  rating?: number;
}

export interface PastorDetail extends PastorListItem {
  slug?: string;
  bio?: string;
}

export interface QuestionListItem {
  _id: string;
  question: string;
  category?: string;
  author: string;
  views: number;
  answers: number;
  timeAgo: string;
  urgent: boolean;
  answer?: string;
  answeredDate?: string;
  helpful?: number;
  pastor?: PastorDetail;
}

export interface QuestionDetail extends QuestionListItem {
  slug?: string;
  status: string;
  answeredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuestionsListData {
  questions: QuestionListItem[];
  pagination: Pagination;
}

export interface QuestionDetailData {
  question: QuestionDetail;
}

export interface PastorsListData {
  pastors: PastorListItem[];
  pagination: Pagination;
}
```

### Polls

```ts
export interface PollOption {
  _id: string;
  text: string;
  votes: number;
  percentage: number;
}

export interface PollListItem {
  _id: string;
  question: string;
  description?: string;
  options: PollOption[];
  totalVotes: number;
  status: 'active' | 'closed';
  timeAgo: string;
  endDate?: string;
}

export interface PollDetail extends PollListItem {
  slug?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PollsListData {
  polls: PollListItem[];
  pagination: Pagination;
}

export interface PollDetailData {
  poll: PollDetail;
}
```

### Artists (community)

```ts
export interface ArtistListItem {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  genre?: string;
  followers?: number;
  verified?: boolean;
  songs?: number;
}

export interface ArtistDetail extends ArtistListItem {
  coverImage?: string;
  bio?: string;
  socials?: Record<string, string>;
}

export interface ArtistsListData {
  artists: ArtistListItem[];
  pagination: Pagination;
}

export interface ArtistDetailData {
  artist: ArtistDetail;
}
```

### Resources

```ts
export interface ResourceListItem {
  _id: string;
  title: string;
  slug?: string;
  description?: string;
  type: string;
  category?: string;
  coverImage?: string;
  downloads?: number;
  price?: number;
  isFree?: boolean;
}

export interface ResourceDetail extends ResourceListItem {
  fileUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourcesListData {
  resources: ResourceListItem[];
  pagination: Pagination;
}
```

---

## 3. Endpoints reference

### Read (GET)

| Method | Path | Response `data` key | Query params |
|--------|------|----------------------|--------------|
| GET | `/public/community` | (hub object) | — |
| GET | `/public/devotionals` | `devotionals`, `pagination` | `type?`, `category?`, `page?`, `limit?`, `status?` |
| GET | `/public/devotionals/:idOrSlug` | `devotional`, `relatedDevotionals?` | — |
| GET | `/public/testimonies` | `testimonies`, `pagination` | `type?`, `category?`, `page?`, `limit?`, `status?` |
| GET | `/public/testimonies/:idOrSlug` | `testimony` | — |
| GET | `/public/prayer-requests` | `prayerRequests`, `pagination` | `status?`, `category?`, `page?`, `limit?` |
| GET | `/public/prayer-requests/:idOrSlug` | `prayerRequest` | — |
| GET | `/public/ask-a-pastor/questions` | `questions`, `pagination` | `status?`, `category?`, `page?`, `limit?` |
| GET | `/public/ask-a-pastor/questions/:idOrSlug` | `question` | — |
| GET | `/public/ask-a-pastor/pastors` | `pastors`, `pagination` | `page?`, `limit?` |
| GET | `/public/polls` | `polls`, `pagination` | `status?`, `page?`, `limit?` |
| GET | `/public/polls/:idOrSlug` | `poll` | — |
| GET | `/public/artists` | `artists`, `pagination` | `page?`, `limit?` |
| GET | `/public/artists/:idOrSlug` | `artist` | — |
| GET | `/public/resources` | `resources`, `pagination` | `type?`, `page?`, `limit?` |

### Write (POST)

| Method | Path | Request body | Response `data` | Status |
|--------|------|---------------|------------------|--------|
| POST | `/public/prayer-requests` | `{ name?, email?, title, content?, category?, urgent? }` | `prayerRequest` | 201 |
| POST | `/public/ask-a-pastor/questions` | `{ name?, email?, question, category? }` | `question` | 201 |
| POST | `/public/testimonies` | `{ name?, category?, content }` | `testimony` | 201 |
| POST | `/public/polls` | `{ question, description?, category?, options: string[] }` (2–6 options) | `poll` | 201 |
| POST | `/public/polls/:idOrSlug/vote` | `{ optionId: string }` | `poll` | 200 |

**Validation (body):**

- Prayer request: `title`, `content` required; `name` max 200, `title` max 200, `content` max 2000.
- Question: `question` required, max 2000; `name` max 200.
- Testimony: `content` required, max 5000; `name` max 200.
- Create poll: `question` and `options` (array 2–6 items) required.

**Vote:** Duplicate vote (same voter identifier) returns **409** with message `"Already voted"`. Invalid `optionId` or closed poll returns **400**. Use `x-voter-id` header or cookie `voter_id` for idempotency if the backend sets it.

---

## 4. Path summary

- Base prefix: **`/public`**
- List endpoints return `{ [listKey]: [], pagination: { page, limit, total, totalPages } }`.
- Detail endpoints return `{ [detailKey]: {} }` (e.g. `devotional`, `testimony`, `prayerRequest`, `question`, `poll`, `artist`).
- `:idOrSlug` is either a MongoDB ObjectId (24 hex) or a slug string; backend resolves and returns 404 if not found.

Copy this file into the **oj-multimedia** repo root (or a `docs/` folder) and use the types/constants for API client and UI.
