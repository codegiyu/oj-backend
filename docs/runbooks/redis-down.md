# Runbook: Redis down

## Symptoms

- `GET /ready` returns **503** with `checks.redis: false`
- Rate limiting may fall back or fail depending on environment
- Session/cache helpers error in logs (`ECONNREFUSED`, `PING` failures)
- API may stay **alive** on `GET /health` while **not ready** for traffic

## Immediate checks

1. Confirm Redis process or managed instance is running.
2. Verify `REDIS_URL` (or host/port/password) in the deployment environment.
3. From the API host: `redis-cli -u "$REDIS_URL" PING` → expect `PONG`.
4. Check network/security groups between API and Redis.

## Mitigation

- Restart Redis or failover to replica (managed Redis: use provider console).
- Roll back recent env changes that pointed to a wrong host/port.
- If Redis is optional for a hotfix window: scale API to zero, fix Redis, then scale up (do not disable readiness checks in production without an explicit incident decision).

## Recovery verification

1. `GET /ready` → **200**, `checks.redis: true` and `checks.mongodb: true`
2. Smoke `GET /api/v1/public/music?page=1&limit=1`
3. Watch logs for `request completed` without Redis connection errors

## Prevention

- Monitor Redis memory, connections, and replication lag
- Keep `REDIS_URL` in secret manager; rotate with staged deploy
