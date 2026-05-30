import type {
  ExtractMediaMetadataJobData,
  MediaKind,
  MediaMetadataEntityType,
} from '../lib/types/queues';
import { addJobToQueue } from '../queues/main.queue';
import { logger } from './logger';
import { isLikelyYoutubeUrl } from './videoEmbed';

function normalizeMediaUrl(url: unknown): string {
  return typeof url === 'string' ? url.trim() : '';
}

function isHttpMediaUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function shouldEnqueueMetadataProbe(oldUrl: unknown, newUrl: unknown): boolean {
  const previous = normalizeMediaUrl(oldUrl);
  const next = normalizeMediaUrl(newUrl);

  if (!next) return false;
  if (previous === next) return false;
  if (!isHttpMediaUrl(next)) return false;
  if (isLikelyYoutubeUrl(next)) return false;

  return true;
}

export async function enqueueMediaMetadataProbe(input: {
  entityType: MediaMetadataEntityType;
  entityId: string;
  mediaUrl: string;
  mediaKind: MediaKind;
}): Promise<string | undefined> {
  const mediaUrl = normalizeMediaUrl(input.mediaUrl);

  if (!shouldEnqueueMetadataProbe('', mediaUrl)) {
    return undefined;
  }

  if (input.mediaKind === 'video' && isLikelyYoutubeUrl(mediaUrl)) {
    return undefined;
  }

  const payload: ExtractMediaMetadataJobData = {
    type: 'extractMediaMetadata',
    entityType: input.entityType,
    entityId: input.entityId,
    mediaUrl,
    mediaKind: input.mediaKind,
  };

  try {
    return await addJobToQueue(payload);
  } catch (err) {
    logger.error('Failed to enqueue media metadata probe', { ...input, err });
    return undefined;
  }
}
