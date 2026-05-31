import { describe, expect, it } from 'vitest';
import {
  buildChartsDateFilter,
  normalizeChartPeriod,
  resolveChartPeriodCutoff,
  resolveChartScopeKey,
  resolveChartWindow,
} from '../../src/constants/musicSections';

describe('music chart period filters', () => {
  const now = new Date('2026-05-30T12:00:00.000Z');

  it('weekly cutoff is 7 days before now', () => {
    const cutoff = resolveChartPeriodCutoff('weekly', now);
    expect(cutoff?.toISOString()).toBe('2026-05-23T12:00:00.000Z');
  });

  it('monthly cutoff is 30 days before now', () => {
    const cutoff = resolveChartPeriodCutoff('monthly', now);
    expect(cutoff?.toISOString()).toBe('2026-04-30T12:00:00.000Z');
  });

  it('alltime returns null cutoff', () => {
    expect(resolveChartPeriodCutoff('alltime', now)).toBeNull();
  });

  it('buildChartsDateFilter returns createdAt gte for weekly', () => {
    expect(buildChartsDateFilter('weekly', now)).toEqual({
      createdAt: { $gte: new Date('2026-05-23T12:00:00.000Z') },
    });
  });
});

describe('resolveChartWindow', () => {
  const now = new Date('2026-05-30T12:00:00.000Z');

  it('weekly rolling window uses 7-day span and period keys', () => {
    const window = resolveChartWindow('weekly', now);

    expect(window.period).toBe('weekly');
    expect(window.windowEnd).toEqual(now);
    expect(window.windowStart.toISOString()).toBe('2026-05-23T12:00:00.000Z');
    expect(window.periodKey).toBe('rolling-7d-2026-05-30');
    expect(window.previousPeriodKey).toBe('rolling-7d-2026-05-23');
  });

  it('monthly rolling window uses 30-day span', () => {
    const window = resolveChartWindow('monthly', now);

    expect(window.period).toBe('monthly');
    expect(window.periodKey).toBe('rolling-30d-2026-05-30');
  });

  it('alltime window spans from epoch with comparison window', () => {
    const window = resolveChartWindow('alltime', now);

    expect(window.period).toBe('alltime');
    expect(window.windowStart.getTime()).toBe(0);
    expect(window.periodKey).toBe('alltime-2026-05-30');
  });
});

describe('resolveChartScopeKey', () => {
  it('maps empty or all to general scope', () => {
    expect(resolveChartScopeKey()).toBe('all');
    expect(resolveChartScopeKey('all')).toBe('all');
    expect(resolveChartScopeKey('')).toBe('all');
  });

  it('normalizes category slug', () => {
    expect(resolveChartScopeKey('Afrobeats')).toBe('afrobeats');
  });
});

describe('normalizeChartPeriod', () => {
  it('defaults unknown values to weekly', () => {
    expect(normalizeChartPeriod()).toBe('weekly');
    expect(normalizeChartPeriod('invalid')).toBe('weekly');
  });
});
