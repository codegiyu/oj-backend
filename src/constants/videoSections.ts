/** Category slugs treated as short-form video content (legacy + catalog). */
export const SHORT_FORM_CATEGORY_SLUGS = ['short', 'short-clips'] as const;

/** Category slugs treated as long-form / movie content (legacy + catalog). */
export const LONG_FORM_CATEGORY_SLUGS = ['movie', 'movies-long-form'] as const;

/** Max duration (seconds) for short-form section when metadata is present. */
export const SHORT_FORM_MAX_DURATION_SECONDS = 90;

/** Min duration (seconds) for long-form section when metadata is present. */
export const LONG_FORM_MIN_DURATION_SECONDS = 600;

export function buildShortFormVideoSectionFilter(): Record<string, unknown> {
  return {
    $or: [
      { category: { $in: [...SHORT_FORM_CATEGORY_SLUGS] } },
      { 'metadata.durationSeconds': { $lte: SHORT_FORM_MAX_DURATION_SECONDS, $gt: 0 } },
    ],
  };
}

export function buildLongFormVideoSectionFilter(): Record<string, unknown> {
  return {
    $or: [
      { category: { $in: [...LONG_FORM_CATEGORY_SLUGS] } },
      { 'metadata.durationSeconds': { $gte: LONG_FORM_MIN_DURATION_SECONDS } },
    ],
  };
}
