## Vendor Dashboard Extra Endpoints

This document describes additional backend endpoints used by the **vendor dashboard** in the `oj-multimedia` frontend.

All endpoints are assumed to be **authenticated** and require a valid vendor account, unless otherwise specified.

---

### 1. Get vendor dashboard stats

- **Key (frontend)**: `VENDOR_GET_DASHBOARD_STATS`
- **Path**: `/vendor/dashboard-stats`
- **Method**: `GET`
- **Used by**: `/account/vendor` (Vendor dashboard home)
- **Description**: Returns lightweight, aggregated statistics for the current vendor so the dashboard does not need to fetch full product and order lists on every load.

#### 1.1 Request

- No request body.
- Uses the authenticated vendor derived from the current user/session.

#### 1.2 Response shape

```jsonc
{
  "success": true,
  "message": "Vendor dashboard stats loaded.",
  "responseCode": 200,
  "data": {
    "productsCount": 12,
    "pendingOrdersCount": 3,
    "totalPaidRevenue": 150000
  }
}
```

Where:

- `productsCount: number`
  - Total count of products belonging to the vendor (all statuses, or limited to active/published based on business rules).
- `pendingOrdersCount: number`
  - Count of orders in any of the **in-progress** states, typically:
    - `pending`
    - `confirmed`
    - `processing`
- `totalPaidRevenue: number`
  - Sum of `totalAmount` for all vendor orders with `paymentStatus === 'paid'`.
  - The numeric format should match how other monetary values are represented in the API (e.g. raw number in the smallest currency unit, or standard decimal).

#### 1.3 Notes / Implementation hints

- The backend should:
  - Use the authenticated vendor context (e.g. `req.user.vendorId`) to scope all queries.
  - Prefer aggregation pipelines or indexed queries instead of loading full product/order documents into memory.
  - Return `403 Forbidden` when:
    - The current user is authenticated but **does not have an associated vendor profile**.
  - Return `404 Not Found` when:
    - A vendor reference exists but the underlying vendor record cannot be found (e.g. deleted or inactive).
- The frontend relies on `403` / `404` to switch to a **"Create your store"** empty state for vendor dashboards.

