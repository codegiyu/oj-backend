import { describe, expect, it } from 'vitest';
import { issueAuthTokens } from '../../src/controllers/auth/auth.helpers';

describe('issueAuthTokens', () => {
  it('issues independent access and refresh JTIs', () => {
    const tokens = issueAuthTokens({
      userId: '507f1f77bcf86cd799439011',
      email: 'admin@example.com',
      scope: 'console-access',
    });

    expect(tokens.accessJti).not.toBe(tokens.refreshJti);
    expect(tokens.accessJti.startsWith('AJTI')).toBe(true);
    expect(tokens.refreshJti.startsWith('RJTI')).toBe(true);
  });
});
