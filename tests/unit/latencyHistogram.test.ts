import { afterEach, describe, expect, it } from 'vitest';
import {
  buildRouteLatencyKey,
  getLatencyHistogramSnapshot,
  recordRequestLatency,
  resetLatencyHistogramForTests,
} from '../../src/observability/latencyHistogram';

describe('latencyHistogram', () => {
  afterEach(() => {
    resetLatencyHistogramForTests();
  });

  it('builds stable route keys for aggregation', () => {
    expect(buildRouteLatencyKey('GET', '/api/v1/public/music')).toBe('GET /api/v1/public/music');
  });

  it('computes p50/p95/p99 for recorded samples', () => {
    const key = 'GET /health';

    for (let value = 1; value <= 100; value += 1) {
      recordRequestLatency(key, value);
    }

    const snapshot = getLatencyHistogramSnapshot();
    const health = snapshot.routes.find(row => row.route === key);

    expect(health?.count).toBe(100);
    expect(health?.p50Ms).toBe(50);
    expect(health?.p95Ms).toBe(95);
    expect(health?.p99Ms).toBe(99);
  });
});
