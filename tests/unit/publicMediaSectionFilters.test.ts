import { describe, expect, it } from 'vitest';
import { buildChartsDateFilter, resolveChartPeriodCutoff } from '../../src/constants/musicSections';
import { buildBreakingNewsSectionFilter, BREAKING_NEWS_MAX_AGE_MS } from '../../src/constants/newsSections';
import {
  buildLongFormVideoSectionFilter,
  buildShortFormVideoSectionFilter,
  LONG_FORM_MIN_DURATION_SECONDS,
  SHORT_FORM_MAX_DURATION_SECONDS,
} from '../../src/constants/videoSections';

describe('video section filters', () => {
  it('short-form filter includes category slugs and duration threshold', () => {
    const filter = buildShortFormVideoSectionFilter();

    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { category: { $in: ['short', 'short-clips'] } },
        { 'metadata.durationSeconds': { $lte: SHORT_FORM_MAX_DURATION_SECONDS, $gt: 0 } },
      ])
    );
  });

  it('long-form filter includes category slugs and duration threshold', () => {
    const filter = buildLongFormVideoSectionFilter();

    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { category: { $in: ['movie', 'movies-long-form'] } },
        { 'metadata.durationSeconds': { $gte: LONG_FORM_MIN_DURATION_SECONDS } },
      ])
    );
  });
});

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

describe('breaking news section filter', () => {
  const now = new Date('2026-05-30T12:00:00.000Z');

  it('requires priority >= 4 and created within 7 days', () => {
    const filter = buildBreakingNewsSectionFilter(now);

    expect(filter.priority).toEqual({ $gte: 4 });
    expect(filter.createdAt).toEqual({
      $gte: new Date(now.getTime() - BREAKING_NEWS_MAX_AGE_MS),
    });
  });
});
