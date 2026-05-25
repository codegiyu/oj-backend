import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addToCache, addJobToQueue, createOtpToken, generateRandomString } = vi.hoisted(() => ({
  addToCache: vi.fn(),
  addJobToQueue: vi.fn(),
  createOtpToken: vi.fn(() => 'jwt-token'),
  generateRandomString: vi.fn(() => 'scope-token-10'),
}));

vi.mock('../../src/utils/cache', () => ({ addToCache }));
vi.mock('../../src/queues/main.queue', () => ({ addJobToQueue }));
vi.mock('../../src/utils/token', () => ({ createOtpToken }));
vi.mock('../../src/utils/helpers', () => ({ generateRandomString }));
vi.mock('../../src/config/env', () => ({
  ENVIRONMENT: {
    appUrls: {
      adminAppUrl: 'https://admin.oj.test/',
      clientAppUrl: 'https://client.oj.test',
    },
  },
}));

import { sendPasswordResetLink } from '../../src/controllers/auth/sendPasswordResetLink';

describe('sendPasswordResetLink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enqueues reset email with admin auth path for console access', async () => {
    await sendPasswordResetLink({
      email: 'admin@oj.test',
      name: 'Admin',
      accessType: 'console',
    });

    expect(addJobToQueue).toHaveBeenCalledWith({
      type: 'resetPassword',
      to: 'admin@oj.test',
      name: 'Admin',
      link: 'https://admin.oj.test/admin/auth/reset-password?email=admin%40oj.test&scopeToken=scope-token-10',
    });
    expect(addToCache).toHaveBeenCalledWith('pers:admin@oj.test:reset-password', 'jwt-token', 1800);
    expect(createOtpToken).toHaveBeenCalledWith(
      { code: 'scope-token-10', scope: 'reset-password' },
      1800
    );
  });

  it('enqueues reset email with client auth path for client access', async () => {
    await sendPasswordResetLink({
      email: 'user@oj.test',
      name: 'User',
      accessType: 'client',
    });

    expect(addJobToQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        link: 'https://client.oj.test/auth/reset-password?email=user%40oj.test&scopeToken=scope-token-10',
      })
    );
  });
});
