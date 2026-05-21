# Operations runbooks (oj-backend)

Quick response guides for common production failures. Pair with `/health` (liveness) and `/ready` (MongoDB + Redis) probes.

| Runbook | Symptom | File |
|---------|---------|------|
| Redis unavailable | `/ready` 503, `checks.redis: false`, cache/session errors | [redis-down.md](./redis-down.md) |
| MongoDB unavailable | `/ready` 503, `checks.mongodb: false`, 5xx on data routes | [mongodb-down.md](./mongodb-down.md) |
| BullMQ backlog | Slow async work, growing queue depth, worker logs stalled | [queue-backlog.md](./queue-backlog.md) |

## Observability

- Every HTTP response includes `x-request-id` (client may send `x-request-id` header; otherwise generated).
- Successful request completions log `request completed` with `requestId`, `method`, `route`, `statusCode`, and `durationMs` for P95/P99 analysis in your log aggregator.

## Related

- [Backend README](../../README.md) — release checklist and env requirements
- [tests/README.md](../../tests/README.md) — verification commands
