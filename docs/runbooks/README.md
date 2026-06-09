# Operations runbooks (oj-backend)

Quick response guides for common production failures. Pair with `/health` (liveness) and `/ready` (MongoDB + Redis) probes.

| Runbook | Symptom | File |
|---------|---------|------|
| Redis unavailable | `/ready` 503, `checks.redis: false`, cache/session errors | [redis-down.md](./redis-down.md) |
| MongoDB unavailable | `/ready` 503, `checks.mongodb: false`, 5xx on data routes | [mongodb-down.md](./mongodb-down.md) |
| BullMQ backlog | Slow async work, growing queue depth, worker logs stalled | [queue-backlog.md](./queue-backlog.md) |
| API vs worker | Jobs never complete, schedulers missing, wrong process count | [deploy-topology.md](./deploy-topology.md) |

## Observability

- Every HTTP response includes `x-request-id` (client may send `x-request-id` header; otherwise generated).
- Successful request completions log `request completed` with `requestId`, `method`, `route`, `statusCode`, and `durationMs` for P95/P99 analysis in your log aggregator.
- Optional rolling percentiles: `ENABLE_METRICS_ROUTE=1` → `GET /metrics` (see [observability.md](../observability.md)).

## Alerts

Wire paging or chat notifications when:

- `/ready` is unhealthy for more than two probe intervals
- Error rate on 5xx exceeds 0.5% on a stable release window
- Log-based p95 on critical routes exceeds 300ms for 15+ minutes
- Queue backlog runbook conditions trigger (see [queue-backlog.md](./queue-backlog.md))

## Related

- [Observability guide](../observability.md) — logs, `/metrics`, alert hints
- [Backend README](../../README.md) — release checklist and env requirements
- [tests/README.md](../../tests/README.md) — verification commands
