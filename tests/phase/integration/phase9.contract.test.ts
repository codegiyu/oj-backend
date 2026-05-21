import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getLatencyHistogramSnapshot,
  recordRequestLatency,
  resetLatencyHistogramForTests,
} from '../../../src/observability/latencyHistogram';

describe('Phase 9 contract (observability completion)', () => {
  it('exposes in-process latency percentiles for ops review', () => {
    resetLatencyHistogramForTests();
    recordRequestLatency('GET /api/v1/public/music', 120);
    recordRequestLatency('GET /api/v1/public/music', 280);

    const snapshot = getLatencyHistogramSnapshot();

    expect(snapshot.routes[0]?.route).toBe('GET /api/v1/public/music');
    expect(snapshot.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    resetLatencyHistogramForTests();
  });

  it('documents observability and alerting guidance', () => {
    const observabilityDoc = readFileSync(join(process.cwd(), 'docs', 'observability.md'), 'utf8');
    const runbooks = readFileSync(join(process.cwd(), 'docs', 'runbooks', 'README.md'), 'utf8');

    expect(observabilityDoc).toContain('request completed');
    expect(observabilityDoc).toContain('/metrics');
    expect(runbooks).toContain('Alerts');
  });
});
