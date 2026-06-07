import { describe, expect, it } from 'vitest';
import { buildChartsDateFilter, resolveChartPeriodCutoff } from '../../src/constants/musicSections';
import { buildBreakingNewsSectionFilter, BREAKING_NEWS_MAX_AGE_MS } from '../../src/constants/newsSections';
import {
  build10To20VideoDurationFilter,
  build5To10VideoDurationFilter,
  buildLongFormVideoDurationFilter,
  buildShortFormVideoSectionFilter,
  buildUnder5VideoDurationFilter,
  buildVideoDurationBucketFilter,
  VIDEO_DURATION_BUCKET_10_20_MAX_SECONDS,
  VIDEO_DURATION_BUCKET_10_20_MIN_SECONDS,
  VIDEO_DURATION_BUCKET_5_10_MAX_SECONDS,
  VIDEO_DURATION_BUCKET_5_10_MIN_SECONDS,
  VIDEO_DURATION_BUCKET_LONG_FORM_MIN_SECONDS,
  VIDEO_DURATION_BUCKET_UNDER_5_MAX_SECONDS,
} from '../../src/constants/videoSections';

describe('video section filters', () => {
  it('under-5 filter uses duration range and category fallback when duration is missing', () => {
    const filter = buildUnder5VideoDurationFilter();

    expect(filter.$or).toEqual(
      expect.arrayContaining([
        {
          'metadata.durationSeconds': {
            $gt: 0,
            $lt: VIDEO_DURATION_BUCKET_UNDER_5_MAX_SECONDS,
          },
        },
        {
          $and: [
            {
              $or: [
                { 'metadata.durationSeconds': { $exists: false } },
                { 'metadata.durationSeconds': null },
                { 'metadata.durationSeconds': { $lte: 0 } },
              ],
            },
            { category: { $in: ['short', 'short-clips'] } },
          ],
        },
      ])
    );
  });

  it('short-form alias matches under-5 filter', () => {
    expect(buildShortFormVideoSectionFilter()).toEqual(buildUnder5VideoDurationFilter());
    expect(buildVideoDurationBucketFilter('short-form')).toEqual(buildUnder5VideoDurationFilter());
  });

  it('5-10 filter matches the 300–599 second range', () => {
    expect(build5To10VideoDurationFilter()).toEqual({
      'metadata.durationSeconds': {
        $gte: VIDEO_DURATION_BUCKET_5_10_MIN_SECONDS,
        $lt: VIDEO_DURATION_BUCKET_5_10_MAX_SECONDS,
      },
    });
  });

  it('10-20 filter matches the 600–1199 second range', () => {
    expect(build10To20VideoDurationFilter()).toEqual({
      'metadata.durationSeconds': {
        $gte: VIDEO_DURATION_BUCKET_10_20_MIN_SECONDS,
        $lt: VIDEO_DURATION_BUCKET_10_20_MAX_SECONDS,
      },
    });
  });

  it('long-form filter uses 1200s threshold and category fallback when duration is missing', () => {
    const filter = buildLongFormVideoDurationFilter();

    expect(filter.$or).toEqual(
      expect.arrayContaining([
        { 'metadata.durationSeconds': { $gte: VIDEO_DURATION_BUCKET_LONG_FORM_MIN_SECONDS } },
        {
          $and: [
            {
              $or: [
                { 'metadata.durationSeconds': { $exists: false } },
                { 'metadata.durationSeconds': null },
                { 'metadata.durationSeconds': { $lte: 0 } },
              ],
            },
            { category: { $in: ['movies', 'movies-long-form', 'drama'] } },
          ],
        },
      ])
    );
  });

  it('buildVideoDurationBucketFilter resolves all bucket types', () => {
    expect(buildVideoDurationBucketFilter('under-5')).toEqual(buildUnder5VideoDurationFilter());
    expect(buildVideoDurationBucketFilter('5-10')).toEqual(build5To10VideoDurationFilter());
    expect(buildVideoDurationBucketFilter('10-20')).toEqual(build10To20VideoDurationFilter());
    expect(buildVideoDurationBucketFilter('long-form')).toEqual(buildLongFormVideoDurationFilter());
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
