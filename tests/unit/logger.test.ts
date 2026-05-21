import { afterEach, describe, expect, it, vi } from 'vitest';

describe('App logger (Pino)', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('logs string messages at info level', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const write = vi.fn();
    vi.doMock('pino', () => ({
      default: vi.fn(() => ({
        info: write,
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        child: vi.fn(),
      })),
    }));

    const { logger } = await import('../../src/utils/logger');

    logger.info('MongoDB connected');

    expect(write).toHaveBeenCalledWith('MongoDB connected');
  });

  it('logs message with object bindings (Winston-style second arg)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const write = vi.fn();
    vi.doMock('pino', () => ({
      default: vi.fn(() => ({
        info: write,
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        child: vi.fn(),
      })),
    }));

    const { logger } = await import('../../src/utils/logger');

    logger.info('Socket connected', { socketId: 'abc', userId: 'u1' });

    expect(write).toHaveBeenCalledWith({ socketId: 'abc', userId: 'u1' }, 'Socket connected');
  });

  it('serializes Error as err binding', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const write = vi.fn();
    vi.doMock('pino', () => ({
      default: vi.fn(() => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: write,
        debug: vi.fn(),
        child: vi.fn(),
      })),
    }));

    const { logger } = await import('../../src/utils/logger');
    const err = new Error('boom');

    logger.error('Request error:', err);

    expect(write).toHaveBeenCalledWith({ err }, 'Request error:');
  });
});
