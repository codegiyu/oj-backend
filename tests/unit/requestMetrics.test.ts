import { describe, expect, it } from 'vitest';
import { buildRequestCompletedLogFields } from '../../src/observability/requestMetrics';

describe('requestMetrics', () => {
  it('builds structured request completed fields for latency tracking', () => {
    const fields = buildRequestCompletedLogFields({
      requestId: 'req-abc',
      method: 'GET',
      route: '/api/v1/public/music',
      statusCode: 200,
      durationMs: 42.4567,
    });

    expect(fields).toEqual({
      requestId: 'req-abc',
      method: 'GET',
      route: '/api/v1/public/music',
      statusCode: 200,
      durationMs: 42.46,
    });
  });
});
