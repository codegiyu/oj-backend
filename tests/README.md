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

Phase 3 migrates all business routes to `/api/v1` (`tests/integration/apiVersion.route.test.ts`).

Phase 4 adds `src/plugins/`, repositories/services for public catalog lists, Pino request IDs, Redis-backed rate limits in production, and `tests/unit/pagination.test.ts`, `publicCatalog.service.test.ts`, `plugins.contract.test.ts`. Type-check/lint for tests uses `tsconfig.test.json` (see `tests/tsconfig.json`).

Phase 5 adds `fastify-plugin` root registration, Pino app logger (`tests/unit/logger.test.ts`), `community.service` + `publicMedia.service` + `adminMusic.service` layering, and `tests/unit/community.service.test.ts`.

Phase 6 (oj-backend validation and audit):

- JSON Schema remains the single validation stack (`src/schemas/response.envelope.ts`); unused `zod` dependency removed.
- Shared success/error response schema helpers in `src/schemas/response.envelope.ts` (contract + `withSuccessEnvelope` for future route wiring); runtime envelope enforced via `sendResponse` / `sendErrorResponse`.
- Structured audit logs (`AuditLog` model) for auth login/logout/password change and admin DELETE/approve/reject via `registerPrivilegedAuditHook`.
- Tests: `tests/unit/privilegedAudit.test.ts`, `response.envelope.test.ts`, `sendResponse.test.ts`, `auditLog.service.test.ts`, `tests/integration/response.envelope.test.ts`, `tests/phase/integration/phase6.contract.test.ts`.

Phase 8 (observability & release readiness):

- Request completion logs: `request completed` with `requestId`, `method`, `route`, `statusCode`, `durationMs` (`src/plugins/observability.plugin.ts`, `src/observability/requestMetrics.ts`).
- Ops runbooks: `docs/runbooks/` (Redis, MongoDB, BullMQ backlog).
- Tests: `tests/unit/requestMetrics.test.ts`, `tests/phase/integration/phase8.contract.test.ts`.

Phase 2 adds:

- `GET /ready` — MongoDB + Redis checks (`tests/integration/ready.route.test.ts`)
- `GET /admin/me` without auth → 401 (`tests/integration/auth.route.test.ts`)
- Invalid `GET /public/music` query → 400 (`tests/integration/validation.route.test.ts`)
- `tests/unit/readiness.service.test.ts`
