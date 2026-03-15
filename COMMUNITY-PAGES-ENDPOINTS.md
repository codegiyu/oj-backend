# Community Pages API Endpoints Specification

This document defines the API endpoints required by the frontend (oj-multimedia) for the **Community** pages: hub, devotionals, testimonies, prayer requests, ask a pastor, polls, artists, and resources. It includes **read** (list/detail) and **write** (submit, vote) operations.

**Backend must:** Follow the response shapes, query parameter semantics, and key names below so the frontend can parse responses without conditional logic.

---

## Response wrapper (all endpoints)

Success responses **must** be wrapped so the frontend's `getDataFromRequest` works:

```ts
{
  success: true,
  message: string,
  responseCode: number,
  data: { ... }  // actual payload (list key, detail key, or mutation result)
}
```

- **List endpoints:** `data` contains e.g. `{ devotionals: [], pagination: {} }`.
- **Detail endpoints:** `data` contains e.g. `{ devotional: {} }` or `{ testimony: {} }`.
- **Mutation endpoints:** `data` contains the created/updated resource (e.g. `{ prayerRequest: {} }`).

Error responses: use appropriate status (400, 404, 409) and a body that the frontend can parse (e.g. `{ success: false, message: string, responseCode: number }`).

---

## Overview of all endpoints

### Read (GET)

| # | Method | Path | Purpose | List key | Detail key |
|---|--------|------|---------|----------|------------|
| 1 | GET | `/public/community` | Community hub (counts, featured, trending) | — | — |
| 2.1 | GET | `/public/devotionals` | List devotionals by type | `devotionals` | — |
| 2.2 | GET | `/public/devotionals/:idOrSlug` | Single devotional + related | — | `devotional` |
| 3.1 | GET | `/public/testimonies` | List testimonies | `testimonies` | — |
| 3.2 | GET | `/public/testimonies/:idOrSlug` | Single testimony | — | `testimony` |
| 4.1 | GET | `/public/prayer-requests` | List prayer requests (active/answered) | `prayerRequests` | — |
| 4.2 | GET | `/public/prayer-requests/:idOrSlug` | Single prayer request | — | `prayerRequest` |
| 5.1 | GET | `/public/ask-a-pastor/questions` | List questions (active/answered) | `questions` | — |
| 5.2 | GET | `/public/ask-a-pastor/questions/:idOrSlug` | Single question | — | `question` |
| 5.3 | GET | `/public/ask-a-pastor/pastors` | List available pastors | `pastors` | — |
| 6.1 | GET | `/public/polls` | List polls | `polls` | — |
| 6.2 | GET | `/public/polls/:idOrSlug` | Single poll | — | `poll` |
| 7.1 | GET | `/public/artists` | List community artists | `artists` | — |
| 7.2 | GET | `/public/artists/:idOrSlug` | Single artist | — | `artist` |
| 8 | GET | `/public/resources` | List resources by type | `resources` or typed keys | — |

### Write (POST)

| # | Method | Path | Purpose | Payload key |
|---|--------|------|---------|-------------|
| W1 | POST | `/public/prayer-requests` | Submit prayer request | body |
| W2 | POST | `/public/ask-a-pastor/questions` | Submit question | body |
| W3 | POST | `/public/testimonies` | Submit testimony | body |
| W4 | POST | `/public/polls/:idOrSlug/vote` | Vote on poll | body `{ optionId }` |
| W5 | POST | `/public/polls` | Create poll (optional) | body |

---

## 1. Community hub

### GET /public/community

**Purpose:** Power the main community landing page (category counts, featured testimonies, trending devotionals, discussions).

| Field | Value |
|-------|--------|
| **Method** | GET |
| **Path** | `/public/community` |
| **Auth** | Not required |

**Query:** None required.

**Response (in `data`):**

```ts
{
  categoryCounts: Record<string, number>;  // e.g. { devotionals: 245, testimonies: 567, ... }
  featuredTestimonies?: TestimonyListItem[];  // optional, limit e.g. 3
  trendingDevotionals?: DevotionalListItem[];  // optional, limit e.g. 4
  activeDiscussions?: DiscussionListItem[];   // optional, limit e.g. 5
}
```

- **Population:** If testimonies/devotionals/discussions are included, populate author/summary fields as in their list endpoints.

---

## 2. Devotionals

### 2.1 GET /public/devotionals

**Purpose:** List devotionals for main page sections and sub-pages (latest, popular, bible-study, etc.).

| Field | Value |
|-------|--------|
| **Method** | GET |
| **Path** | `/public/devotionals` |
| **Auth** | Not required |

**Query parameters:**

| Param | Type | Required | Default | Valid values / behavior |
|-------|------|----------|---------|-------------------------|
| `type` | string | No | — | `daily` \| `latest` \| `popular` \| `bible-study` \| `prayer-points` \| `living-tips` \| `marriage-family`. Determines which subset/ordering. |
| `category` | string | No | No filter | Category slug; `all` or omitted = no filter. |
| `page` | number | No | `1` | 1-based. |
| `limit` | number | No | `12` | Max items per page (cap e.g. 100). |
| `status` | string | No | Backend default | Frontend may send `published`; return only published when present. |

**Response (in `data`):** `GetListRes<DevotionalListItem, 'devotionals'>`

```ts
{
  devotionals: DevotionalListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

**DevotionalListItem:** `_id`, `title`, `slug`, `excerpt`, `category`, `author` (populated `{ _id, name, avatar? }` or string), `views`, `createdAt`, and type-specific fields (e.g. `verse`, `date`, `readingTime` for daily; `lessons`, `duration` for bible-study).

---

### 2.2 GET /public/devotionals/:idOrSlug

**Purpose:** Single devotional for detail page, with related items.

| Field | Value |
|-------|--------|
| **Method** | GET |
| **Path** | `/public/devotionals/:idOrSlug` |
| **Auth** | Not required |

**Path:** `idOrSlug` — MongoDB ObjectId or slug. Resolve by id then slug; **404** if not found.

**Response (in `data`):**

```ts
{
  devotional: DevotionalDetail;
  relatedDevotionals?: DevotionalListItem[];  // optional, same category, limit e.g. 3
}
```

**DevotionalDetail:** Full document; populate `author` as needed. 404 if not found.

---

## 3. Testimonies

### 3.1 GET /public/testimonies

**Purpose:** List testimonies (all, featured, latest).

| Field | Value |
|-------|--------|
| **Method** | GET |
| **Path** | `/public/testimonies` |
| **Auth** | Not required |

**Query parameters:**

| Param | Type | Required | Default | Valid values |
|-------|------|----------|---------|--------------|
| `type` | string | No | — | `all` \| `featured` \| `latest` |
| `category` | string | No | No filter | Category slug; `all` or omitted = no filter. |
| `page` | number | No | `1` | 1-based. |
| `limit` | number | No | `12` | Max per page. |
| `status` | string | No | — | e.g. `published` when sent. |

**Response (in `data`):** `GetListRes<TestimonyListItem, 'testimonies'>`

```ts
{
  testimonies: TestimonyListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

**TestimonyListItem:** `_id`, `author`, `avatar`, `content`, `likes`, `comments`, `timeAgo` (or `createdAt`), `category`.

---

### 3.2 GET /public/testimonies/:idOrSlug

**Purpose:** Single testimony for detail page.

**Path:** `idOrSlug` — ObjectId or slug. **404** if not found.

**Response (in `data`):** `{ testimony: TestimonyDetail }`

---

## 4. Prayer requests

### 4.1 GET /public/prayer-requests

**Purpose:** List active and/or answered prayer requests.

| Field | Value |
|-------|--------|
| **Method** | GET |
| **Path** | `/public/prayer-requests` |
| **Auth** | Not required |

**Query parameters:**

| Param | Type | Required | Default | Valid values |
|-------|------|----------|---------|--------------|
| `status` | string | No | — | `active` \| `answered` \| omit for both (backend may return separate arrays or combined). |
| `category` | string | No | No filter | Category slug. |
| `page` | number | No | `1` | 1-based. |
| `limit` | number | No | `12` | Max per page. |

**Response (in `data`):** Either a single list or split:

```ts
{
  prayerRequests: PrayerRequestListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

Or for hub-style: `{ activeRequests: [], answeredPrayers: [], categoryCounts: {} }` — document one shape and stick to it. Recommended: single list with `status` filter; frontend can call twice (active, answered) if needed.

**PrayerRequestListItem:** `_id`, `title`, `content`, `author`, `category`, `prayers`, `comments`, `timeAgo`, `urgent`, and for answered: `testimony`, `answeredDate` if applicable.

---

### 4.2 GET /public/prayer-requests/:idOrSlug

**Purpose:** Single prayer request. **404** if not found.

**Response (in `data`):** `{ prayerRequest: PrayerRequestDetail }`

---

## 5. Ask a pastor

### 5.1 GET /public/ask-a-pastor/questions

**Purpose:** List questions (active or answered).

| Field | Value |
|-------|--------|
| **Method** | GET |
| **Path** | `/public/ask-a-pastor/questions` |
| **Auth** | Not required |

**Query parameters:**

| Param | Type | Required | Default | Valid values |
|-------|------|----------|---------|--------------|
| `status` | string | No | — | `active` \| `answered` |
| `category` | string | No | No filter | Category slug. |
| `page` | number | No | `1` | 1-based. |
| `limit` | number | No | `12` | Max per page. |

**Response (in `data`):** `GetListRes<QuestionListItem, 'questions'>`

**QuestionListItem:** `_id`, `question`, `category`, `author`, `views`, `answers` (count or list), `timeAgo`, `urgent`; for answered: `answer`, `pastor`, `answeredDate`, `helpful`. Populate `pastor` as `{ _id, name, title, church, image }`.

---

### 5.2 GET /public/ask-a-pastor/questions/:idOrSlug

**Purpose:** Single question. **404** if not found.

**Response (in `data`):** `{ question: QuestionDetail }` (full question with answer and pastor populated if answered).

---

### 5.3 GET /public/ask-a-pastor/pastors

**Purpose:** List available pastors for the “Ask a pastor” page.

**Query:** Optional `page`, `limit`.

**Response (in `data`):** `GetListRes<PastorListItem, 'pastors'>` or simple `{ pastors: PastorListItem[] }`.

**PastorListItem:** `_id`, `name`, `title`, `church`, `image`, `expertise` (array), `questionsAnswered`, `rating`.

---

## 6. Polls

### 6.1 GET /public/polls

**Purpose:** List polls (active, closed, or both).

| Field | Value |
|-------|--------|
| **Method** | GET |
| **Path** | `/public/polls` |
| **Auth** | Not required |

**Query parameters:**

| Param | Type | Required | Default | Valid values |
|-------|------|----------|---------|--------------|
| `status` | string | No | — | `active` \| `closed` \| omit for both. |
| `page` | number | No | `1` | 1-based. |
| `limit` | number | No | `12` | Max per page. |

**Response (in `data`):** `GetListRes<PollListItem, 'polls'>`

**PollListItem:** `_id`, `question`, `description`, `options` (array of `{ _id, text, votes, percentage }`), `totalVotes`, `status` (`active` \| `closed`), `timeAgo`, `endDate`.

---

### 6.2 GET /public/polls/:idOrSlug

**Purpose:** Single poll for detail/vote page. **404** if not found.

**Response (in `data`):** `{ poll: PollDetail }` (same shape with full options and vote counts).

---

## 7. Artists (community)

### 7.1 GET /public/artists

**Purpose:** List community artists (summary for cards).

**Query:** `page`, `limit` (optional).

**Response (in `data`):** `GetListRes<ArtistListItem, 'artists'>`

**ArtistListItem:** `_id`, `name`, `slug`, `image`, `genre`, `followers`, `verified`, `songs` (count optional).

---

### 7.2 GET /public/artists/:idOrSlug

**Purpose:** Single artist profile. **404** if not found.

**Response (in `data`):** `{ artist: ArtistDetail }`

---

## 8. Resources

### GET /public/resources

**Purpose:** List resources (ebooks, templates, beats, wallpapers, affiliate products). Can be one endpoint with `type` filter or separate keys in one response.

**Query parameters:**

| Param | Type | Required | Default | Valid values |
|-------|------|----------|---------|--------------|
| `type` | string | No | — | `ebook` \| `template` \| `beat` \| `wallpaper` \| `affiliate` (or return all in one response with typed keys). |
| `page` | number | No | `1` | 1-based. |
| `limit` | number | No | `12` | Max per page. |

**Response (in `data`):** Either:

```ts
{
  resources: ResourceListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

or for hub-style sections:

```ts
{
  ebooks: ResourceListItem[];
  templates: ResourceListItem[];
  beats: ResourceListItem[];
  wallpapers: ResourceListItem[];
  affiliateProducts: ResourceListItem[];
}
```

Document one contract. **ResourceListItem** (per type): `title`, `description`, `downloads`, and type-specific fields (`cover`, `templateType`, `genre`, `category`, `price`, etc.).

---

## 9. Mutation endpoints (write)

### W1. POST /public/prayer-requests — Submit prayer request

**Purpose:** Submit a new prayer request from the community form.

| Field | Value |
|-------|--------|
| **Method** | POST |
| **Path** | `/public/prayer-requests` |
| **Auth** | Optional (guest allowed) or required — document choice. |

**Request body:**

```ts
{
  name?: string;      // max length e.g. 200
  email?: string;     // valid email if provided
  title: string;      // required, max e.g. 200
  content: string;    // required, max e.g. 2000
  category?: string; // category slug or id
  urgent?: boolean;   // default false
}
```

**Response:** **201** with body (wrapped in `data`): `{ prayerRequest: PrayerRequestDetail }` (created item). **400** for validation errors (message in body).

---

### W2. POST /public/ask-a-pastor/questions — Submit question

**Purpose:** Submit a question for a pastor.

| Field | Value |
|-------|--------|
| **Method** | POST |
| **Path** | `/public/ask-a-pastor/questions` |
| **Auth** | Optional or required. |

**Request body:**

```ts
{
  name?: string;
  email?: string;
  question: string;   // required, max e.g. 2000
  category?: string;
}
```

**Response:** **201** with `data: { question: QuestionDetail }`. **400** for validation.

---

### W3. POST /public/testimonies — Submit testimony

**Purpose:** Submit a testimony from the community form.

| Field | Value |
|-------|--------|
| **Method** | POST |
| **Path** | `/public/testimonies` |
| **Auth** | Optional or required. |

**Request body:**

```ts
{
  name?: string;
  category?: string;
  content: string;   // required, max e.g. 5000
}
```

**Response:** **201** with `data: { testimony: TestimonyDetail }`. **400** for validation.

---

### W4. POST /public/polls/:idOrSlug/vote — Vote on poll

**Purpose:** Record a vote for one option. Backend must prevent duplicate votes (e.g. by session, cookie, or user id).

| Field | Value |
|-------|--------|
| **Method** | POST |
| **Path** | `/public/polls/:idOrSlug/vote` |
| **Auth** | Optional (session/cookie/fingerprint for idempotency). |

**Path:** `idOrSlug` — poll id or slug. **404** if poll not found.

**Request body:**

```ts
{
  optionId: string;  // required, _id of the chosen option
}
```

**Response:** **200** with `data: { poll: PollDetail }` (updated poll with new vote counts and percentages). **400** if `optionId` invalid or poll closed. **409** if user/session already voted (or **400** with message “Already voted” — document one).

**Duplicate vote:** Enforce one vote per identifier (e.g. session id, cookie, or user id) per poll. Return **409** or **400** with clear message so frontend can show “You have already voted.”

---

### W5. POST /public/polls — Create poll (optional)

**Purpose:** Allow users to create a new poll. Include only if product supports it.

| Field | Value |
|-------|--------|
| **Method** | POST |
| **Path** | `/public/polls` |
| **Auth** | Optional or required. |

**Request body:**

```ts
{
  question: string;       // required
  description?: string;
  category?: string;
  options: string[];       // required, 2–6 options (backend may enforce)
}
```

**Response:** **201** with `data: { poll: PollDetail }`. **400** for validation (e.g. too few options).

---

## 10. Pagination and list shape

- **Pagination:** `{ page: number; limit: number; total: number; totalPages: number }`. `page` is 1-based. `total` = total matching count before pagination. `totalPages = Math.ceil(total / limit)`.
- **Empty lists:** Return `[]` for the list key and `total: 0`; do not return an error.
- **IdOrSlug:** All detail and vote routes accept MongoDB ObjectId or slug; resolve and return **404** when not found.

---

## 11. Common pitfalls

| Pitfall | Correct behavior |
|--------|-------------------|
| Unwrapped response | Wrap success body in `{ success, message, responseCode, data }`. |
| Wrong list key | Use exact keys: `devotionals`, `testimonies`, `prayerRequests`, `questions`, `polls`, `artists`, etc. |
| 500 on not found | Return **404** for missing detail/vote target. |
| Allowing duplicate vote | Enforce one vote per user/session per poll; return **409** or **400** with message. |
| Ignoring validation | Return **400** with clear message for invalid payloads (missing required, max length). |

---

## 12. Implementation status (backend)

- **Stub implementation:** Community routes are implemented in `src/controllers/public/community.controller.ts` and registered in `src/routes/public.route.ts`. List endpoints return empty arrays and correct pagination; POST submit endpoints (prayer request, question, testimony, create poll) accept payloads and return 201 with a stub created resource.
- **Detail endpoints:** GET devotionals/:idOrSlug, testimonies/:idOrSlug, prayer-requests/:idOrSlug, ask-a-pastor/questions/:idOrSlug, polls/:idOrSlug, artists/:idOrSlug currently return **404** until corresponding models and persistence exist.
- **Vote:** POST /public/polls/:idOrSlug/vote returns **404** until poll model and vote persistence (with duplicate-vote handling) are implemented.
- **Next steps:** Add Mongoose models for Devotional, Testimony, PrayerRequest, Question, Pastor, Poll, CommunityArtist, Resource (or reuse existing where applicable); implement list/detail handlers with real queries; implement vote with session/cookie or user id to enforce one vote per identifier per poll.
