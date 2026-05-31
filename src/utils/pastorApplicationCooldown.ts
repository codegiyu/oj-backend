import {
  PASTOR_APPLICATION_REAPPLY_COOLDOWN_DAYS,
  type IPastorApplication,
} from '../lib/types/constants';

export type PastorApplicationCooldown = {
  canReapply: boolean;
  reapplyAvailableAt: string | null;
  cooldownDaysRemaining: number;
};

/** Compute whether a user may submit a new pastor application after rejection. */
export function computePastorApplicationCooldown(
  rejectedAt: Date | string | null | undefined
): PastorApplicationCooldown {
  if (!rejectedAt) {
    return { canReapply: true, reapplyAvailableAt: null, cooldownDaysRemaining: 0 };
  }

  const rejected = rejectedAt instanceof Date ? rejectedAt : new Date(rejectedAt);
  const availableAt = new Date(rejected);
  availableAt.setDate(availableAt.getDate() + PASTOR_APPLICATION_REAPPLY_COOLDOWN_DAYS);

  const now = new Date();
  if (now >= availableAt) {
    return { canReapply: true, reapplyAvailableAt: null, cooldownDaysRemaining: 0 };
  }

  const msRemaining = availableAt.getTime() - now.getTime();
  const cooldownDaysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  return {
    canReapply: false,
    reapplyAvailableAt: availableAt.toISOString(),
    cooldownDaysRemaining,
  };
}

export function shapePastorApplicationCooldownFields(
  application: Pick<IPastorApplication, 'status' | 'rejectedAt'>
): PastorApplicationCooldown {
  if (application.status !== 'rejected') {
    return { canReapply: true, reapplyAvailableAt: null, cooldownDaysRemaining: 0 };
  }

  return computePastorApplicationCooldown(application.rejectedAt);
}
