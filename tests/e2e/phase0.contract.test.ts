import { describe, expect, it } from 'vitest';

/**
 * Full HTTP e2e against a running server lands in a later phase.
 * This file keeps the test:e2e script wired until Playwright or live-stack tests exist.
 */
describe('e2e contract (phase 0)', () => {
  it('reserves the e2e suite entrypoint', () => {
    expect(true).toBe(true);
  });
});
