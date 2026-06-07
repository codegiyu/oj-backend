import { describe, expect, it } from 'vitest';
import { JOB_TYPES } from '../../../src/lib/types/queues';

describe('phase 1B artist follow backend contract', () => {
  it('registers reconcileArtistFollowerCounts queue job type', () => {
    expect(JOB_TYPES).toContain('reconcileArtistFollowerCounts');
  });
});
