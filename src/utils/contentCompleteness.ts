/**
 * Public catalog completeness: items missing primary content must not be served.
 */

import { isLikelyYoutubeUrl } from './videoEmbed';

const NON_EMPTY = /\S/;

export function hasNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && NON_EMPTY.test(value.trim());
}

export function isSermonCategory(category: unknown): boolean {
  if (typeof category !== 'string') return false;

  return /^sermons?$/i.test(category.trim());
}

export function isCompleteMusic(raw: Record<string, unknown>): boolean {
  if (isSermonCategory(raw.category)) {
    return hasNonEmptyString(raw.audioUrl) || hasNonEmptyString(raw.videoUrl);
  }

  return hasNonEmptyString(raw.audioUrl);
}

export function isCompleteVideo(raw: Record<string, unknown>): boolean {
  const fileFromField = typeof raw.videoFileUrl === 'string' ? raw.videoFileUrl.trim() : '';
  const legacyUrl = typeof raw.videoUrl === 'string' ? raw.videoUrl.trim() : '';
  const embedField = typeof raw.embedUrl === 'string' ? raw.embedUrl.trim() : '';

  const videoFileUrl =
    fileFromField || (legacyUrl && !isLikelyYoutubeUrl(legacyUrl) ? legacyUrl : '');
  const embedUrl = embedField || (legacyUrl && isLikelyYoutubeUrl(legacyUrl) ? legacyUrl : '');

  return Boolean(videoFileUrl || embedUrl);
}

export function isCompleteNewsArticle(raw: Record<string, unknown>): boolean {
  return hasNonEmptyString(raw.content);
}

export function isCompleteDevotional(raw: Record<string, unknown>): boolean {
  return hasNonEmptyString(raw.content);
}

export function isCompleteTestimony(raw: Record<string, unknown>): boolean {
  return hasNonEmptyString(raw.content);
}

export function isCompletePrayerRequest(raw: Record<string, unknown>): boolean {
  return hasNonEmptyString(raw.content);
}

export function isCompleteResource(raw: Record<string, unknown>): boolean {
  if (raw.type === 'affiliate') return true;

  return hasNonEmptyString(raw.fileUrl);
}

export function isCompleteGospelVerse(raw: Record<string, unknown>): boolean {
  return hasNonEmptyString(raw.verse);
}

/** Merge a base Mongo filter with a completeness clause. */
export function mergePublicFilter(
  base: Record<string, unknown>,
  completeness: Record<string, unknown>
): Record<string, unknown> {
  const baseKeys = Object.keys(base);

  if (baseKeys.length === 0) return { ...completeness };

  if (base.$and && Array.isArray(base.$and)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { $and: [...base.$and, completeness] };
  }

  return { $and: [base, completeness] };
}

export function publishedMusicCompletenessFilter(): Record<string, unknown> {
  return {
    $or: [
      {
        category: { $not: { $regex: /^sermons?$/i } },
        audioUrl: { $regex: NON_EMPTY },
      },
      {
        category: { $regex: /^sermons?$/i },
        $or: [{ audioUrl: { $regex: NON_EMPTY } }, { videoUrl: { $regex: NON_EMPTY } }],
      },
    ],
  };
}

export function publishedVideoCompletenessFilter(): Record<string, unknown> {
  return {
    $or: [
      { videoFileUrl: { $regex: NON_EMPTY } },
      { embedUrl: { $regex: NON_EMPTY } },
      { videoUrl: { $regex: NON_EMPTY } },
    ],
  };
}

export function publishedTextContentCompletenessFilter(field = 'content'): Record<string, unknown> {
  return { [field]: { $regex: NON_EMPTY } };
}

export function publishedResourceCompletenessFilter(): Record<string, unknown> {
  return {
    $or: [{ type: 'affiliate' }, { fileUrl: { $regex: NON_EMPTY } }],
  };
}

export function gospelVerseCompletenessFilter(): Record<string, unknown> {
  return { verse: { $regex: NON_EMPTY } };
}
