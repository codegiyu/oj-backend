import { describe, expect, it } from 'vitest';
import {
  computePastorApplicationCooldown,
  shapePastorApplicationCooldownFields,
} from '../../src/utils/pastorApplicationCooldown';
import { PASTOR_APPLICATION_REAPPLY_COOLDOWN_DAYS } from '../../src/lib/types/constants';

describe('pastor application cooldown', () => {
  it('allows reapply when there is no rejection date', () => {
    const result = computePastorApplicationCooldown(null);
    expect(result.canReapply).toBe(true);
    expect(result.cooldownDaysRemaining).toBe(0);
  });

  it('blocks reapply within cooldown window', () => {
    const rejectedAt = new Date();
    const result = computePastorApplicationCooldown(rejectedAt);

    expect(result.canReapply).toBe(false);
    expect(result.reapplyAvailableAt).toBeTruthy();
    expect(result.cooldownDaysRemaining).toBeGreaterThan(0);
    expect(result.cooldownDaysRemaining).toBeLessThanOrEqual(PASTOR_APPLICATION_REAPPLY_COOLDOWN_DAYS);
  });

  it('allows reapply after cooldown expires', () => {
    const rejectedAt = new Date();
    rejectedAt.setDate(rejectedAt.getDate() - (PASTOR_APPLICATION_REAPPLY_COOLDOWN_DAYS + 1));

    const result = computePastorApplicationCooldown(rejectedAt);
    expect(result.canReapply).toBe(true);
    expect(result.cooldownDaysRemaining).toBe(0);
  });

  it('returns cooldown fields for rejected applications only', () => {
    const pending = shapePastorApplicationCooldownFields({ status: 'pending', rejectedAt: null });
    expect(pending.canReapply).toBe(true);

    const rejected = shapePastorApplicationCooldownFields({
      status: 'rejected',
      rejectedAt: new Date(),
    });
    expect(rejected.canReapply).toBe(false);
  });
});
