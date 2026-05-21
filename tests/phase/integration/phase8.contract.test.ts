import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildRequestCompletedLogFields } from '../../../src/observability/requestMetrics';

const runbooksDir = join(process.cwd(), 'docs', 'runbooks');

describe('Phase 8 contract (observability & release readiness)', () => {
  it('builds request completed log fields for latency tracking', () => {
    const fields = buildRequestCompletedLogFields({
      requestId: 'phase8-req',
      method: 'GET',
      route: '/health',
      statusCode: 200,
      durationMs: 12.3,
    });

    expect(fields.durationMs).toBe(12.3);
    expect(fields.requestId).toBe('phase8-req');
  });

  it('ships operational runbooks for Redis, MongoDB, and BullMQ', () => {
    const readme = readFileSync(join(runbooksDir, 'README.md'), 'utf8');

    expect(readme).toContain('redis-down.md');
    expect(readme).toContain('mongodb-down.md');
    expect(readme).toContain('queue-backlog.md');
    expect(readFileSync(join(runbooksDir, 'redis-down.md'), 'utf8')).toContain('/ready');
  });
});
