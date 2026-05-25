import { describe, expect, it } from 'vitest';
import { parseNullableObjectId } from '../../src/utils/parseNullableObjectId';

describe('parseNullableObjectId', () => {
  it('accepts valid ids and null to clear links', () => {
    expect(parseNullableObjectId(null, 'artistId')).toBeNull();
    expect(parseNullableObjectId('507f1f77bcf86cd799439011', 'artistId')).toBeTruthy();
  });

  it('rejects invalid ids', () => {
    expect(() => parseNullableObjectId('not-an-id', 'artistId')).toThrow(/Invalid artistId/i);
  });
});
