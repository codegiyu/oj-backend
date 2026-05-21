# Runbook: BullMQ queue backlog

## Symptoms

- Emails, notifications, or other async jobs delayed by minutes/hours
- Worker logs show retries or stalled jobs
- Redis is up (queues use Redis) but job depth grows monotonically
- API may remain **ready** while async side effects lag

## Immediate checks

1. Confirm the **worker process** is running (separate from the HTTP server if deployed that way).
2. Check Redis memory and key count; BullMQ keys under the configured prefix.
3. Inspect failed jobs in BullMQ (DLQ / failed set) for recurring errors.
4. Review recent deploys that changed job payloads or processors.

## Mitigation

- Restart worker(s) after fixing root cause (bad payload, missing env, external API down).
- Temporarily increase worker concurrency only if downstream systems can handle load.
- Pause producers (disable features that enqueue) if backlog risks Redis memory pressure.
- Re-queue or discard poison messages after capturing samples for a fix.

## Recovery verification

1. Queue depth trends down over 15–30 minutes
2. Spot-check a job type (e.g. test email) completes end-to-end
3. No new failures in worker logs

## Prevention

- Monitor queue depth, job age P95, and worker restarts
- Time-box job retries; alert on sustained failure rate
