import type { MediaKind } from '../lib/types/queues';
import { shouldEnqueueMetadataProbe } from './mediaMetadataEnqueue';

export const MEDIA_METADATA_BACKFILL_MIGRATION = 'media-metadata-backfill-v1';

export function normalizeMediaUrl(url: unknown): string {
  return typeof url === 'string' ? url.trim() : '';
}

function readDurationSeconds(metadata: unknown): unknown {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;

  return Reflect.get(metadata, 'durationSeconds');
}

export function hasCompleteMediaMetadata(metadata: unknown): boolean {
  const seconds = readDurationSeconds(metadata);

  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0;
}

export function resolveMusicProbeTarget(doc: {
  audioUrl?: unknown;
  videoUrl?: unknown;
}): { mediaUrl: string; mediaKind: MediaKind } | null {
  const audioUrl = normalizeMediaUrl(doc.audioUrl);

  if (shouldEnqueueMetadataProbe('', audioUrl)) {
    return { mediaUrl: audioUrl, mediaKind: 'audio' };
  }

  const videoUrl = normalizeMediaUrl(doc.videoUrl);

  if (shouldEnqueueMetadataProbe('', videoUrl)) {
    return { mediaUrl: videoUrl, mediaKind: 'video' };
  }

  return null;
}

export function resolveVideoProbeTarget(doc: {
  videoFileUrl?: unknown;
  videoUrl?: unknown;
}): { mediaUrl: string; mediaKind: MediaKind } | null {
  const videoFileUrl = normalizeMediaUrl(doc.videoFileUrl);

  if (shouldEnqueueMetadataProbe('', videoFileUrl)) {
    return { mediaUrl: videoFileUrl, mediaKind: 'video' };
  }

  const videoUrl = normalizeMediaUrl(doc.videoUrl);

  if (shouldEnqueueMetadataProbe('', videoUrl)) {
    return { mediaUrl: videoUrl, mediaKind: 'video' };
  }

  return null;
}

export function shouldBackfillMediaMetadata(metadata: unknown): boolean {
  return !hasCompleteMediaMetadata(metadata);
}
