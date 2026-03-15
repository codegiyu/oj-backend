## Artist Dashboard API Endpoints

This document describes the backend endpoints used by the **artist dashboard** in the `oj-multimedia` frontend.

All endpoints are assumed to be **authenticated** and require a valid artist profile (user with linked artist), unless otherwise specified.

---

### 1. Get artist profile (me)

- **Key (frontend)**: `ARTIST_GET_ME`
- **Path**: `/artist/me`
- **Method**: `GET`
- **Used by**: Artist dashboard home, Settings, Upload (auth/artist check)
- **Description**: Returns the current user's artist profile for the artist portal.

#### 1.1 Request

- No request body.
- Uses the authenticated user; resolves artist profile via `user.artistId` or equivalent.

#### 1.2 Response shape

```jsonc
{
  "success": true,
  "message": "Artist profile loaded.",
  "responseCode": 200,
  "data": {
    "artist": {
      "_id": "...",
      "name": "Artist Name",
      "slug": "artist-name",
      "bio": "...",
      "image": "https://...",
      "coverImage": "https://...",
      "genre": "Gospel",
      "socials": {
        "facebook": "...",
        "instagram": "...",
        "twitter": "...",
        "youtube": "...",
        "website": "..."
      },
      "isFeatured": false,
      "isActive": true,
      "displayOrder": 0,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

**Population**: None required; returns the artist document for the current user. Ensure `_id` is serialized as string for the client.

#### 1.3 Error handling

- Return `403 Forbidden` when the current user is authenticated but **does not have an associated artist profile**.
- Return `404 Not Found` when an artist reference exists but the artist record cannot be found.

---

### 2. Update artist profile (me)

- **Key (frontend)**: `ARTIST_UPDATE_ME`
- **Path**: `/artist/me`
- **Method**: `PATCH`
- **Used by**: Artist Settings page
- **Description**: Updates the current artist profile.

#### 2.1 Request body (IArtistUpdateMePayload)

| Field        | Type   | Required | Description                    |
| ------------ | ------ | -------- | ------------------------------ |
| name         | string | no       | Artist display name            |
| bio          | string | no       | Biography                      |
| image        | string | no       | Profile image URL              |
| coverImage   | string | no       | Cover image URL                |
| genre        | string | no       | Genre (e.g. Gospel)            |
| socials      | object | no       | facebook, instagram, twitter, youtube, website |

#### 2.2 Response

Same shape as **Get artist profile**: `data.artist` is the updated artist document (client-friendly: dates and ObjectIds as strings).

---

### 3. Get artist dashboard stats

- **Key (frontend)**: `ARTIST_GET_DASHBOARD_STATS`
- **Path**: `/artist/dashboard-stats`
- **Method**: `GET`
- **Used by**: `/account/artist-portal` (Artist dashboard home)
- **Description**: Returns lightweight, aggregated statistics so the dashboard does not need to fetch full music and video lists on every load.

#### 3.1 Request

- No request body.
- Uses the authenticated artist derived from the current user/session.

#### 3.2 Response shape

```jsonc
{
  "success": true,
  "message": "Artist dashboard stats loaded.",
  "responseCode": 200,
  "data": {
    "tracksCount": 12,
    "videosCount": 4,
    "totalPlays": 1200,
    "totalViews": 800
  }
}
```

Where:

- `tracksCount: number` – Total count of music tracks belonging to the artist (all statuses, or per business rules).
- `videosCount: number` – Total count of videos belonging to the artist.
- `totalPlays: number` – Sum of plays/streams for the artist's music (e.g. `views` or equivalent on music documents).
- `totalViews: number` (optional) – Sum of views for the artist's videos. Frontend may use this for a combined or separate stat.

#### 3.3 Error handling

- Return `403` when the user has no artist profile; `404` when artist record is missing.
- Frontend uses 403/404 to show an empty or “Complete your artist profile” state.

---

### 4. List artist music

- **Key (frontend)**: `ARTIST_GET_MUSIC`
- **Path**: `/artist/music`
- **Method**: `GET`
- **Used by**: Artist Music list page
- **Description**: Returns paginated list of music tracks for the current artist.

#### 4.1 Query parameters

| Param  | Type   | Default | Description                                  |
| ------ | ------ | ------- | -------------------------------------------- |
| page   | number | 1       | Page number (1-based)                         |
| limit  | number | 10      | Page size                                    |
| status | string | (all)   | Filter: `draft` \| `published` \| `archived` |

#### 4.2 Response shape (IArtistMusicListRes)

```jsonc
{
  "success": true,
  "data": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    },
    "music": [
      {
        "_id": "...",
        "title": "...",
        "slug": "...",
        "status": "published",
        "description": "...",
        "coverImage": "...",
        "audioUrl": "...",
        "plays": 520,
        "downloads": 120,
        "createdAt": "...",
        "updatedAt": "...",
        "artist": { "_id": "...", "name": "...", "slug": "...", "image": "..." }
      }
    ]
  }
}
```

**Population**: Each list item may optionally populate `artist` with `{ _id, name, slug, image }` (PopulatedArtistSummary). Frontend expects fields such as: `_id`, `title`, `status`, `plays` (or `views`), `downloads`, `createdAt`. Map backend field names (e.g. `views` → `plays` if needed) or document the canonical names.

---

### 5. Get single music track (for edit)

- **Key (frontend)**: `ARTIST_GET_MUSIC_ITEM`
- **Path**: `/artist/music/:id`
- **Method**: `GET`
- **Used by**: Artist Upload page (edit mode: `?id=...&type=music`)
- **Description**: Returns one music track by id for the current artist (for pre-filling edit form).

#### 5.1 Request

- Path param: `id` – music document `_id`.
- Must belong to the current artist; return 403/404 otherwise.

#### 5.2 Response shape (IArtistMusicItemRes)

```jsonc
{
  "success": true,
  "data": {
    "music": {
      "_id": "...",
      "title": "...",
      "slug": "...",
      "description": "...",
      "lyrics": "...",
      "coverImage": "...",
      "audioUrl": "...",
      "videoUrl": "...",
      "category": "...",
      "status": "draft",
      "isMonetizable": false,
      "plays": 0,
      "downloads": 0,
      "createdAt": "...",
      "updatedAt": "...",
      "artist": { "_id": "...", "name": "...", "slug": "...", "image": "..." }
    }
  }
}
```

**Population**: Optional `artist` as `{ _id, name, slug, image }`.

---

### 6. Create music track

- **Key (frontend)**: `ARTIST_CREATE_MUSIC`
- **Path**: `/artist/music`
- **Method**: `POST`
- **Used by**: Artist Upload page (new track)

#### 6.1 Request body (IArtistCreateMusicPayload)

| Field         | Type    | Required | Description           |
| ------------- | ------- | -------- | --------------------- |
| title         | string  | yes      | Track title           |
| description   | string  | no       | Description           |
| lyrics        | string  | no       | Lyrics                |
| coverImage    | string  | no       | Cover image URL       |
| audioUrl      | string  | no       | Audio file URL        |
| videoUrl      | string  | no       | Video URL             |
| category      | string  | no       | Category              |
| isMonetizable | boolean | no       | Monetization flag     |

#### 6.2 Response

Same as **Get single music track**: `data.music` is the created document (with optional `artist` population).

---

### 7. Update music track

- **Key (frontend)**: `ARTIST_UPDATE_MUSIC`
- **Path**: `/artist/music/:id`
- **Method**: `PATCH`
- **Used by**: Artist Upload page (edit mode)

#### 7.1 Request body (IArtistUpdateMusicPayload)

Same fields as create, all optional; plus:

| Field  | Type   | Description                    |
| ------ | ------ | ------------------------------ |
| status | string | `draft` \| `published` \| `archived` |

#### 7.2 Response

Same as **Get single music track**: `data.music` is the updated document.

---

### 8. Delete music track

- **Key (frontend)**: `ARTIST_DELETE_MUSIC`
- **Path**: `/artist/music/:id`
- **Method**: `DELETE`
- **Used by**: Artist Music list (optional delete action)

#### 8.1 Response

```jsonc
{
  "success": true,
  "data": { "success": true }
}
```

Ensure the track belongs to the current artist; return 403/404 otherwise.

---

### 9. List artist videos

- **Key (frontend)**: `ARTIST_GET_VIDEOS`
- **Path**: `/artist/videos`
- **Method**: `GET`
- **Used by**: Artist Videos list page
- **Description**: Returns paginated list of videos for the current artist.

#### 9.1 Query parameters

Same as **List artist music**: `page`, `limit`, `status` (`draft` \| `published` \| `archived`).

#### 9.2 Response shape (IArtistVideosListRes)

```jsonc
{
  "success": true,
  "data": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 8,
      "totalPages": 1
    },
    "videos": [
      {
        "_id": "...",
        "title": "...",
        "slug": "...",
        "status": "published",
        "description": "...",
        "thumbnail": "...",
        "videoUrl": "...",
        "views": 320,
        "createdAt": "...",
        "updatedAt": "...",
        "artist": { "_id": "...", "name": "...", "slug": "...", "image": "..." }
      }
    ]
  }
}
```

**Population**: Optional `artist` as `{ _id, name, slug, image }`. Frontend expects `_id`, `title`, `status`, `views`, `createdAt`, etc.

---

### 10. Get single video (for edit)

- **Key (frontend)**: `ARTIST_GET_VIDEO_ITEM`
- **Path**: `/artist/videos/:id`
- **Method**: `GET`
- **Used by**: Artist Upload page (edit mode: `?id=...&type=video`)
- **Description**: Returns one video by id for the current artist (for pre-filling edit form).

#### 10.1 Request

- Path param: `id` – video document `_id`.
- Must belong to the current artist.

#### 10.2 Response shape (IArtistVideoItemRes)

```jsonc
{
  "success": true,
  "data": {
    "video": {
      "_id": "...",
      "title": "...",
      "slug": "...",
      "description": "...",
      "thumbnail": "...",
      "videoUrl": "...",
      "category": "...",
      "status": "draft",
      "isMonetizable": false,
      "views": 0,
      "createdAt": "...",
      "updatedAt": "...",
      "artist": { "_id": "...", "name": "...", "slug": "...", "image": "..." }
    }
  }
}
```

**Population**: Optional `artist` as `{ _id, name, slug, image }`.

---

### 11. Create video

- **Key (frontend)**: `ARTIST_CREATE_VIDEO`
- **Path**: `/artist/videos`
- **Method**: `POST`
- **Used by**: Artist Upload page (new video)

#### 11.1 Request body (IArtistCreateVideoPayload)

| Field         | Type    | Required | Description           |
| ------------- | ------- | -------- | --------------------- |
| title         | string  | yes      | Video title            |
| description   | string  | no       | Description            |
| thumbnail     | string  | no       | Thumbnail URL          |
| videoUrl      | string  | no       | Video URL              |
| category      | string  | no       | Category               |
| isMonetizable | boolean | no       | Monetization flag      |

#### 11.2 Response

Same as **Get single video**: `data.video` is the created document.

---

### 12. Update video

- **Key (frontend)**: `ARTIST_UPDATE_VIDEO`
- **Path**: `/artist/videos/:id`
- **Method**: `PATCH`
- **Used by**: Artist Upload page (edit mode)

#### 12.1 Request body (IArtistUpdateVideoPayload)

Same as create, all optional; plus `status`: `draft` \| `published` \| `archived`.

#### 12.2 Response

Same as **Get single video**: `data.video` is the updated document.

---

### 13. Delete video

- **Key (frontend)**: `ARTIST_DELETE_VIDEO`
- **Path**: `/artist/videos/:id`
- **Method**: `DELETE`
- **Used by**: Artist Videos list (optional delete action)

#### 13.1 Response

```jsonc
{
  "success": true,
  "data": { "success": true }
}
```

Ensure the video belongs to the current artist; return 403/404 otherwise.

---

## Summary: Population requirements

- **Artist profile (me)**: No population; flat artist document.
- **Music list item**: Optional `artist`: `{ _id, name, slug, image }`.
- **Music single (edit)**: Optional `artist`: `{ _id, name, slug, image }`.
- **Video list item**: Optional `artist`: `{ _id, name, slug, image }`.
- **Video single (edit)**: Optional `artist`: `{ _id, name, slug, image }`.

All `_id` and date fields should be serialized to strings for the client (e.g. JSON response with lean documents).

---

## Frontend integration notes

- **Single-item GET (edit)**: The frontend calls `ARTIST_GET_MUSIC_ITEM` and `ARTIST_GET_VIDEO_ITEM` with path `/artist/music` and `/artist/videos` and appends the id as query (e.g. `/${id}`), resulting in requests to `/artist/music/:id` and `/artist/videos/:id`. The backend should accept the id as a path parameter.
- **Settings**: The Artist Settings form sends `IArtistUpdateMePayload` including optional `socials` (facebook, instagram, twitter, youtube, website). Backend should accept and persist these fields.
- **Create music/video**: The frontend validates that `audioUrl` is present for new music and `videoUrl` for new video before submitting. Backend may still treat these as optional in the payload type; business rules can require them for publish.
- **List delete actions**: The Music and Videos list pages call `ARTIST_DELETE_MUSIC` and `ARTIST_DELETE_VIDEO` with the item id (query `/${id}`). Return 403/404 when the item does not belong to the current artist; frontend shows a toast on error and refetches the list on success.
