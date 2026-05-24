import { describe, expect, it } from 'vitest';
import { ENTITY_TYPES } from '../../../src/lib/types/constants';

describe('phase 6 album backend contract', () => {
  it('registers album as an upload entity type', () => {
    expect(ENTITY_TYPES).toContain('album');
  });
});
