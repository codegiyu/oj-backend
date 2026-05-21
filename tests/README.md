# oj-backend tests

Scripts follow the workspace test contract:

| Script | Scope |
|--------|--------|
| `npm run test:unit` | `tests/unit` |
| `npm run test:integration` | `tests/integration` (Fastify `inject`, no live server) |
| `npm run test:e2e` | `tests/e2e` (Vitest placeholder until live-stack e2e) |
| `npm run test:phase` | All active work under `tests/phase` |
| `npm run test:phase:unit` | `tests/phase/unit` |
| `npm run test:phase:integration` | `tests/phase/integration` |
| `npm run test:phase:e2e` | `tests/phase/e2e` |

Run the full contract: `npm run test:unit && npm run test:integration && npm run test:e2e`.

Phase 1 adds `tests/integration/env.validation.test.ts` for production env fail-fast rules.

Phase 2 adds:

- `GET /ready` — MongoDB + Redis checks (`tests/integration/ready.route.test.ts`)
- `GET /admin/me` without auth → 401 (`tests/integration/auth.route.test.ts`)
- Invalid `GET /public/music` query → 400 (`tests/integration/validation.route.test.ts`)
- `tests/unit/readiness.service.test.ts`
