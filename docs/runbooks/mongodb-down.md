# Runbook: MongoDB down

## Symptoms

- `GET /ready` returns **503** with `checks.mongodb: false`
- Most business routes return **5xx** or timeout
- Logs show Mongoose connection errors (`MongoServerSelectionError`, `ECONNREFUSED`)

## Immediate checks

1. Confirm MongoDB cluster/instance status (Atlas or self-hosted).
2. Verify `DATABASE_URL` in the deployment environment (correct user, password, host, database name, TLS params).
3. Check IP allowlist / VPC peering if using managed MongoDB.
4. Review recent migrations or index builds that could overload the primary.

## Mitigation

- Restore primary or elect new primary (replica set).
- Increase connection pool cautiously only after DB is healthy.
- Pause write-heavy admin jobs until DB is stable.

## Recovery verification

1. `GET /ready` → **200**
2. Smoke auth and a read endpoint: `GET /api/v1/public/music?page=1&limit=1`
3. Confirm error rate drops in logs/metrics

## Prevention

- Enable automated backups and test restore quarterly
- Alert on connection count, disk usage, and replication lag
