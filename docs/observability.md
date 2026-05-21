# Observability (oj-backend)

## Request logging

Every completed HTTP request logs **`request completed`** with:

| Field | Purpose |
|-------|---------|
| `requestId` | Correlate with `x-request-id` response header |
| `method` | HTTP verb |
| `route` | Fastify route template or URL |
| `statusCode` | Response status |
| `durationMs` | Round-trip time for P95/P99 analysis in your log stack |

**NFR targets:** P95 ≤ 300ms and P99 ≤ 800ms on critical routes (see workspace NFR rules).

## In-process latency histogram

The API keeps a rolling sample window (500 requests per route key) and computes **p50 / p95 / p99** in memory.

Enable the snapshot route for staging or internal networks only:

```bash
ENABLE_METRICS_ROUTE=1
```

Then call:

```http
GET /metrics
```

Response `data.routes[]` lists `{ route, count, p50Ms, p95Ms, p99Ms }` sorted by p95 descending.

Do **not** expose `/metrics` on the public internet without authentication or network policy.

## Readiness and health

| Endpoint | Use |
|----------|-----|
| `GET /health` | Liveness (process up) |
| `GET /ready` | Readiness (MongoDB + Redis) |

See [runbooks](./runbooks/README.md) when `/ready` fails.

## Alerts (recommended)

Configure monitors for:

- `/ready` non-200 for > 2 minutes
- 5xx rate > 0.5% over 15 minutes
- `request completed` p95 above 300ms on `/api/v1/public/*` and `/api/v1/auth/login`
- BullMQ queue depth growth (see [queue-backlog runbook](./runbooks/queue-backlog.md))

## Related

- [README release checklist](../README.md#release-checklist)
- [tests/README.md](../tests/README.md)
