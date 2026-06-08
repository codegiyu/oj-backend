import { describe, expect, it } from 'vitest';
import { deleteFields } from '../../src/utils/helpers';

describe('deleteFields', () => {
  it('preserves Date instances when removing nested fields', () => {
    const createdAt = new Date('2024-06-01T12:00:00.000Z');
    const input = {
      email: 'user@example.com',
      auth: {
        lastLogin: createdAt,
        password: { value: 'secret' },
      },
    };

    const result = deleteFields(input, ['auth.password']);

    expect(result.auth.lastLogin).toBeInstanceOf(Date);
    expect(result.auth.lastLogin?.toISOString()).toBe(createdAt.toISOString());
    expect(result.auth).not.toHaveProperty('password');
    expect(result.email).toBe('user@example.com');
  });
});
