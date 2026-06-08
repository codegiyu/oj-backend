import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisMock = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  unlink: vi.fn(),
  scanStream: vi.fn(),
};

vi.mock('../../src/config/redis', () => ({
  getRedisClient: () => redisMock,
}));

vi.mock('../../src/config/env', () => ({
  ENVIRONMENT: {
    redis: { cacheExpiry: 300 },
  },
}));

import {
  clearNamespace,
  getFromCacheOrDB,
} from '../../src/utils/cache';

describe('getFromCacheOrDB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.get.mockResolvedValue(null);
    redisMock.set.mockResolvedValue('OK');
  });

  it('returns null when the DB query finds nothing', async () => {
    const dbQuery = vi.fn(async () => null);

    await expect(getFromCacheOrDB('vol:test:key', dbQuery)).resolves.toBeNull();
    expect(dbQuery).toHaveBeenCalledOnce();
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it('caches and returns data when the DB query succeeds', async () => {
    const dbQuery = vi.fn(async () => ({ id: '1' }));

    await expect(getFromCacheOrDB('vol:test:key', dbQuery)).resolves.toEqual({ id: '1' });
    expect(redisMock.set).toHaveBeenCalledOnce();
  });

  it('returns cached data without hitting the DB', async () => {
    redisMock.get.mockResolvedValue(JSON.stringify({ id: 'cached' }));
    const dbQuery = vi.fn(async () => ({ id: 'db' }));

    await expect(getFromCacheOrDB('vol:test:key', dbQuery)).resolves.toEqual({ id: 'cached' });
    expect(dbQuery).not.toHaveBeenCalled();
  });
});

describe('clearNamespace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pauses the stream while unlinking and resumes afterward', async () => {
    const handlers: Record<string, (payload?: unknown) => void> = {};
    const stream = {
      pause: vi.fn(),
      resume: vi.fn(),
      on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
        handlers[event] = handler;
      }),
    };

    redisMock.scanStream.mockReturnValue(stream);
    redisMock.unlink.mockResolvedValue(1);

    const pending = clearNamespace('vol:chart:');
    handlers.data?.(['vol:chart:1', 'vol:chart:2']);

    await new Promise(resolve => setTimeout(resolve, 0));
    handlers.end?.();

    await pending;

    expect(stream.pause).toHaveBeenCalledOnce();
    expect(redisMock.unlink).toHaveBeenCalledWith('vol:chart:1', 'vol:chart:2');
    expect(stream.resume).toHaveBeenCalledOnce();
  });

  it('logs unlink errors but still resolves', async () => {
    const handlers: Record<string, (payload?: unknown) => void> = {};
    const stream = {
      pause: vi.fn(),
      resume: vi.fn(),
      on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
        handlers[event] = handler;
      }),
    };

    redisMock.scanStream.mockReturnValue(stream);
    redisMock.unlink.mockRejectedValue(new Error('unlink failed'));

    const pending = clearNamespace('vol:chart:');
    handlers.data?.(['vol:chart:bad']);

    await new Promise(resolve => setTimeout(resolve, 0));
    handlers.end?.();

    await expect(pending).resolves.toBeUndefined();
    expect(stream.resume).toHaveBeenCalledOnce();
  });
});
