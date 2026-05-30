export type ChartPeriod = 'weekly' | 'monthly' | 'alltime';

const PERIOD_MS: Record<Exclude<ChartPeriod, 'alltime'>, number> = {
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

export function resolveChartPeriodCutoff(
  period: string | undefined,
  now: Date = new Date()
): Date | null {
  if (!period || period === 'alltime') return null;

  const ms = PERIOD_MS[period as Exclude<ChartPeriod, 'alltime'>];
  if (!ms) return null;

  return new Date(now.getTime() - ms);
}

export function buildChartsDateFilter(
  period: string | undefined,
  now: Date = new Date()
): Record<string, unknown> | null {
  const cutoff = resolveChartPeriodCutoff(period, now);
  if (!cutoff) return null;

  return { createdAt: { $gte: cutoff } };
}
