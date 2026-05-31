export type ChartPeriod = 'weekly' | 'monthly' | 'alltime';

const DAY_MS = 24 * 60 * 60 * 1000;

const PERIOD_MS: Record<Exclude<ChartPeriod, 'alltime'>, number> = {
  weekly: 7 * DAY_MS,
  monthly: 30 * DAY_MS,
};

export interface ChartWindowResult {
  period: ChartPeriod;
  windowStart: Date;
  windowEnd: Date;
  previousWindowStart: Date;
  previousWindowEnd: Date;
  periodKey: string;
  previousPeriodKey: string;
}

export function normalizeChartPeriod(period?: string): ChartPeriod {
  if (period === 'monthly' || period === 'alltime') return period;

  return 'weekly';
}

export function resolveChartScopeKey(category?: string | null): string {
  if (!category || category === 'all') return 'all';

  return category.trim().toLowerCase();
}

function formatDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function resolveChartWindow(
  periodInput?: string,
  now: Date = new Date()
): ChartWindowResult {
  const period = normalizeChartPeriod(periodInput);
  const windowEnd = now;

  if (period === 'weekly') {
    const windowStart = new Date(now.getTime() - PERIOD_MS.weekly);
    const previousWindowEnd = windowStart;
    const previousWindowStart = new Date(now.getTime() - PERIOD_MS.weekly * 2);

    return {
      period,
      windowStart,
      windowEnd,
      previousWindowStart,
      previousWindowEnd,
      periodKey: `rolling-7d-${formatDayKey(windowEnd)}`,
      previousPeriodKey: `rolling-7d-${formatDayKey(previousWindowEnd)}`,
    };
  }

  if (period === 'monthly') {
    const windowStart = new Date(now.getTime() - PERIOD_MS.monthly);
    const previousWindowEnd = windowStart;
    const previousWindowStart = new Date(now.getTime() - PERIOD_MS.monthly * 2);

    return {
      period,
      windowStart,
      windowEnd,
      previousWindowStart,
      previousWindowEnd,
      periodKey: `rolling-30d-${formatDayKey(windowEnd)}`,
      previousPeriodKey: `rolling-30d-${formatDayKey(previousWindowEnd)}`,
    };
  }

  const windowStart = new Date(0);
  const previousWindowEnd = new Date(now.getTime() - PERIOD_MS.monthly);
  const previousWindowStart = new Date(now.getTime() - PERIOD_MS.monthly * 2);

  return {
    period: 'alltime',
    windowStart,
    windowEnd,
    previousWindowStart,
    previousWindowEnd,
    periodKey: `alltime-${formatDayKey(windowEnd)}`,
    previousPeriodKey: `alltime-${formatDayKey(previousWindowEnd)}`,
  };
}

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

export function startOfUtcDay(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
