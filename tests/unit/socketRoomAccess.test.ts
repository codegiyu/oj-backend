import { describe, expect, it } from 'vitest';
import { isAllowedSocketRoom } from '../../src/socket/roomAccess';
import type { SocketUser } from '../../src/socket/auth';

describe('isAllowedSocketRoom', () => {
  const userA: SocketUser = {
    _id: '507f1f77bcf86cd799439011',
    userModel: 'User',
    email: 'a@example.com',
    scope: 'client-access',
  };

  it('allows the user own prefixed room', () => {
    expect(isAllowedSocketRoom(userA, 'user:507f1f77bcf86cd799439011')).toBe(true);
  });

  it('allows the legacy userId-only room', () => {
    expect(isAllowedSocketRoom(userA, userA._id)).toBe(true);
  });

  it('denies another user room', () => {
    expect(isAllowedSocketRoom(userA, 'user:507f1f77bcf86cd799439099')).toBe(false);
  });

  it('denies arbitrary room strings', () => {
    expect(isAllowedSocketRoom(userA, 'admin:507f1f77bcf86cd799439099')).toBe(false);
  });
});
