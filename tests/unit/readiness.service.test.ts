import { afterEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { getReadinessChecks } from '../../src/services/readiness.service';

vi.mock('../../src/config/redis', () => ({
  getRedisClient: vi.fn(),
}));

import { getRedisClient } from '../../src/config/redis';

describe('getReadinessChecks', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports not ready when MongoDB is disconnected and Redis ping fails', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);
    vi.mocked(getRedisClient).mockReturnValue({
      ping: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
    } as never);

    const checks = await getReadinessChecks();

    expect(checks).toEqual({ mongodb: false, redis: false });
  });

  it('reports ready when MongoDB is connected and Redis responds', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
    vi.mocked(getRedisClient).mockReturnValue({
      ping: vi.fn().mockResolvedValue('PONG'),
    } as never);

    const checks = await getReadinessChecks();

    expect(checks).toEqual({ mongodb: true, redis: true });
  });
});
