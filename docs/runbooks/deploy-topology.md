# Deploy topology — API and worker split

## Production (recommended)

Run **two processes** against the same MongoDB and Redis:

| Process | Command | Role |
|---------|---------|------|
| API | `npm start` → `node dist/server.js` | HTTP, Socket.io, enqueue jobs |
| Worker | `npm run start:worker` → `node dist/worker.js` | BullMQ job processing, chart schedulers |

- **Do not** set `RUN_WORKER=true` in production when using a dedicated worker container.
- **Do not** rely on API boot to seed data — run `npm run seed` as a one-off migration job when needed.

## Development

```bash
# Terminal 1 — API only
npm run dev

# Terminal 2 — worker + schedulers
npm run dev:worker
```

For a single-process local setup, set `RUN_WORKER=true` when starting the API so the worker colocates with HTTP:

```bash
RUN_WORKER=true npm run dev
```

## Shared dependencies

Both processes require:

- `DATABASE_URL`
- `REDIS_URL`
- Same JWT/storage/email env as the API (worker handlers may read DB and send mail)

## Health checks

- Probe **API** `/health` and `/ready` — worker has no HTTP port.
- Monitor worker via logs (`BullMQ worker process started`) and queue depth (see [queue-backlog.md](./queue-backlog.md)).

## Docker / orchestration

- Build one image; use different `CMD` per service (`npm start` vs `npm run start:worker`).
- Scale API and worker replicas independently.
- Run `npm run seed` as a Kubernetes Job / one-off task after deploy, not on every pod start.
