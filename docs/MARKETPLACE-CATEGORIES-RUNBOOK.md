# Marketplace categories — operations runbook

Marketplace product categories and subcategories are **seed-driven**, not managed through the admin dashboard. Editorial content categories (`/admin/dashboard/content-categories`) are a separate system.

## Source of truth

- Seed data: [`src/lib/seed/marketplaceCategories.ts`](../src/lib/seed/marketplaceCategories.ts)
- Seed function: `seedMarketplaceCategories()` in [`src/seed/functions.ts`](../src/seed/functions.ts)
- Public API: `GET /api/v1/marketplace/categories` and `GET /api/v1/marketplace/subcategories`

## Adding or updating categories

1. Edit `MARKETPLACE_CATEGORIES` in `marketplaceCategories.ts` (category name + subcategory names).
2. Run the seed step on the target environment:
   - Enable `await seedMarketplaceCategories();` in [`src/seed/index.ts`](../src/seed/index.ts), or
   - Invoke the seed function from your deployment/migration pipeline.
3. The seed is **idempotent** (upsert by slug). Existing categories are updated; new entries are inserted.
4. Verify via API:
   - `GET /api/v1/marketplace/categories`
   - `GET /api/v1/marketplace/subcategories?category=<slug>`

## Deactivating a category

Prefer setting `isActive: false` on the MongoDB `categories` / `subcategories` documents if you need a temporary hide without redeploying seed data. Products referencing inactive categories may still exist — review product assignments before deactivation.

## When to build admin CRUD

Consider an admin categories UI if non-engineers need frequent taxonomy changes, or if environments diverge from seed data often. Until then, treat seed + idempotent deploy as the supported workflow.

## Related docs

- [`MARKETPLACE-CATEGORIES-PRODUCTS.md`](../MARKETPLACE-CATEGORIES-PRODUCTS.md) — API and model reference
- [`MARKETPLACE-PUBLIC-PAGES-ENDPOINTS.md`](../MARKETPLACE-PUBLIC-PAGES-ENDPOINTS.md) — public browse endpoints
