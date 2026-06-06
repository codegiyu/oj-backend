/** Category slugs treated as short-form video content (legacy + catalog). */
export const SHORT_FORM_CATEGORY_SLUGS = ['short', 'short-clips'] as const;

/** Category slugs treated as long-form / movie content (legacy + catalog). */
export const LONG_FORM_CATEGORY_SLUGS = ['movie', 'movies-long-form'] as const;

/** Duration bucket: under 5 minutes — `0 < duration < 300`. */
export const VIDEO_DURATION_BUCKET_UNDER_5_MAX_SECONDS = 300;

/** Duration bucket: 5–10 minutes — `300 <= duration < 600`. */
export const VIDEO_DURATION_BUCKET_5_10_MIN_SECONDS = 300;
export const VIDEO_DURATION_BUCKET_5_10_MAX_SECONDS = 600;

/** Duration bucket: 10–20 minutes — `600 <= duration < 1200`. */
export const VIDEO_DURATION_BUCKET_10_20_MIN_SECONDS = 600;
export const VIDEO_DURATION_BUCKET_10_20_MAX_SECONDS = 1200;

/** Duration bucket: long-form — `duration >= 1200`. */
export const VIDEO_DURATION_BUCKET_LONG_FORM_MIN_SECONDS = 1200;

/** @deprecated Use VIDEO_DURATION_BUCKET_UNDER_5_MAX_SECONDS minus one for upper bound semantics. */
export const SHORT_FORM_MAX_DURATION_SECONDS = VIDEO_DURATION_BUCKET_UNDER_5_MAX_SECONDS - 1;

/** @deprecated Use VIDEO_DURATION_BUCKET_LONG_FORM_MIN_SECONDS. */
export const LONG_FORM_MIN_DURATION_SECONDS = VIDEO_DURATION_BUCKET_LONG_FORM_MIN_SECONDS;

export type VideoDurationBucketType = 'under-5' | '5-10' | '10-20' | 'long-form' | 'short-form';

function buildMissingDurationFilter(): Record<string, unknown> {
  return {
    $or: [
      { 'metadata.durationSeconds': { $exists: false } },
      { 'metadata.durationSeconds': null },
      { 'metadata.durationSeconds': { $lte: 0 } },
    ],
  };
}

export function buildUnder5VideoDurationFilter(): Record<string, unknown> {
  return {
    $or: [
      {
        'metadata.durationSeconds': {
          $gt: 0,
          $lt: VIDEO_DURATION_BUCKET_UNDER_5_MAX_SECONDS,
        },
      },
      {
        $and: [buildMissingDurationFilter(), { category: { $in: [...SHORT_FORM_CATEGORY_SLUGS] } }],
      },
    ],
  };
}

export function build5To10VideoDurationFilter(): Record<string, unknown> {
  return {
    'metadata.durationSeconds': {
      $gte: VIDEO_DURATION_BUCKET_5_10_MIN_SECONDS,
      $lt: VIDEO_DURATION_BUCKET_5_10_MAX_SECONDS,
    },
  };
}

export function build10To20VideoDurationFilter(): Record<string, unknown> {
  return {
    'metadata.durationSeconds': {
      $gte: VIDEO_DURATION_BUCKET_10_20_MIN_SECONDS,
      $lt: VIDEO_DURATION_BUCKET_10_20_MAX_SECONDS,
    },
  };
}

export function buildLongFormVideoDurationFilter(): Record<string, unknown> {
  return {
    $or: [
      { 'metadata.durationSeconds': { $gte: VIDEO_DURATION_BUCKET_LONG_FORM_MIN_SECONDS } },
      {
        $and: [buildMissingDurationFilter(), { category: { $in: [...LONG_FORM_CATEGORY_SLUGS] } }],
      },
    ],
  };
}

/** `short-form` is a compatibility alias for `under-5`. */
export function buildShortFormVideoSectionFilter(): Record<string, unknown> {
  return buildUnder5VideoDurationFilter();
}

export function buildLongFormVideoSectionFilter(): Record<string, unknown> {
  return buildLongFormVideoDurationFilter();
}

export function buildVideoDurationBucketFilter(
  type: VideoDurationBucketType
): Record<string, unknown> {
  switch (type) {
    case 'under-5':
    case 'short-form':
      return buildUnder5VideoDurationFilter();
    case '5-10':
      return build5To10VideoDurationFilter();
    case '10-20':
      return build10To20VideoDurationFilter();
    case 'long-form':
      return buildLongFormVideoDurationFilter();
    default:
      return {};
  }
}
