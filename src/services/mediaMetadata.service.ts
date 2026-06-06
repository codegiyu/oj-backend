import dns from 'node:dns/promises';
import { isIP } from 'node:net';
import { Readable } from 'node:stream';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import mongoose from 'mongoose';
import { parseStream } from 'music-metadata';
import { ENVIRONMENT } from '../config/env';
import type { MediaMetadataEntityType, MediaKind } from '../lib/types/queues';
import { Music } from '../models/music';
import { Video } from '../models/video';
import { AppError } from '../utils/AppError';
import { parseYoutubeId } from '../utils/videoEmbed';

export const MEDIA_PROBE_TIMEOUT_MS = 15_000;

export interface MediaProbeResult {
  durationSeconds?: number;
  mimeType?: string;
  bitrate?: number;
  sampleRate?: number;
  codec?: string;
  container?: string;
  provider?: 'r2' | 'youtube' | 'external';
  mediaKind: MediaKind;
  probedAt: string;
}

export type MediaMetadataPatch = Partial<Omit<MediaProbeResult, 'mediaKind'>> & {
  mediaKind?: MediaKind;
};

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal']);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => Number.isNaN(part))) return false;

  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;

  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized === '::1') return true;
  if (normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  return false;
}

function isPrivateIpAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);

  return false;
}

function assertAllowedHostname(hostname: string): void {
  const host = hostname.toLowerCase().replace(/\.$/, '');

  if (!host) {
    throw new AppError('Media URL hostname is required', 400);
  }

  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new AppError('Media URL host is not allowed', 400);
  }

  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new AppError('Media URL host is not allowed', 400);
  }

  const ipVersion = isIP(host);
  if (ipVersion !== 0 && isPrivateIpAddress(host)) {
    throw new AppError('Media URL host is not allowed', 400);
  }
}

export async function assertSafeMediaUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new AppError('Media URL must be a valid absolute URL', 400);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new AppError('Media URL must use http or https', 400);
  }

  if (parsed.username || parsed.password) {
    throw new AppError('Media URL must not include credentials', 400);
  }

  assertAllowedHostname(parsed.hostname);

  const resolved = await dns.lookup(parsed.hostname, { all: true, verbatim: true });
  if (resolved.length === 0) {
    throw new AppError('Media URL host could not be resolved', 400);
  }

  for (const entry of resolved) {
    if (isPrivateIpAddress(entry.address)) {
      throw new AppError('Media URL host is not allowed', 400);
    }
  }

  return parsed;
}

function extractConfiguredR2KeyFromUrl(url: string): string | null {
  const cdn = ENVIRONMENT.r2.cdnUrl?.trim();
  const pub = ENVIRONMENT.r2.publicUrl?.trim();

  if (cdn && url.startsWith(cdn)) return url.slice(cdn.length).replace(/^\//, '');
  if (pub && url.startsWith(pub)) return url.slice(pub.length).replace(/^\//, '');

  return null;
}

async function streamR2Object(key: string): Promise<{ stream: Readable; mimeType?: string }> {
  const { r2Client, r2Config } = await import('../config/r2');
  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: r2Config.bucketName,
      Key: key,
      Range: 'bytes=0-5242880',
    })
  );

  if (!response.Body) {
    throw new AppError('R2 media probe response had no body', 422);
  }

  const body = response.Body as unknown;
  let stream: Readable;
  if (body instanceof Readable) {
    stream = body;
  } else if (
    typeof body === 'object' &&
    body !== null &&
    'transformToWebStream' in body &&
    typeof (body as { transformToWebStream?: unknown }).transformToWebStream === 'function'
  ) {
    stream = Readable.fromWeb(
      (
        body as { transformToWebStream: () => import('stream/web').ReadableStream }
      ).transformToWebStream()
    );
  } else {
    throw new AppError('R2 media probe response body is not streamable', 422);
  }

  return { stream, mimeType: response.ContentType || undefined };
}

async function fetchMediaStream(
  url: string
): Promise<{ stream: Readable; mimeType?: string; provider: 'r2' | 'external' }> {
  await assertSafeMediaUrl(url);
  const r2Key = extractConfiguredR2KeyFromUrl(url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(MEDIA_PROBE_TIMEOUT_MS),
      headers: {
        'User-Agent': 'OJ-MediaMetadata/1.0',
        Range: 'bytes=0-5242880',
      },
    });

    if (!response.ok) {
      throw new AppError(`Media probe failed with HTTP ${response.status}`, 422);
    }

    const finalUrl = response.url || url;
    await assertSafeMediaUrl(finalUrl);

    if (!response.body) {
      throw new AppError('Media probe response had no body', 422);
    }

    const mimeType = response.headers.get('content-type')?.split(';')[0]?.trim();

    return {
      stream: Readable.fromWeb(response.body as import('stream/web').ReadableStream),
      mimeType: mimeType || undefined,
      provider: r2Key ? 'r2' : 'external',
    };
  } catch (error) {
    if (!r2Key) throw error;

    const fallback = await streamR2Object(r2Key);
    return { ...fallback, provider: 'r2' };
  }
}

export function parseIso8601DurationSeconds(duration: string): number | undefined {
  const match = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match) return undefined;

  const days = Number(match[1] ?? 0);
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  const seconds = Number(match[4] ?? 0);
  const total = days * 86400 + hours * 3600 + minutes * 60 + seconds;

  return Number.isFinite(total) && total > 0 ? total : undefined;
}

async function probeYoutubeUrl(url: string): Promise<MediaProbeResult> {
  const videoId = parseYoutubeId(url);
  if (!videoId) {
    throw new AppError('YouTube video id could not be parsed', 400);
  }

  const apiKey = ENVIRONMENT.youtube.apiKey.trim();
  if (!apiKey) {
    throw new AppError('YouTube API key is not configured', 422);
  }

  const apiUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  apiUrl.searchParams.set('part', 'contentDetails');
  apiUrl.searchParams.set('id', videoId);
  apiUrl.searchParams.set('key', apiKey);

  const response = await fetch(apiUrl, {
    method: 'GET',
    signal: AbortSignal.timeout(MEDIA_PROBE_TIMEOUT_MS),
    headers: { 'User-Agent': 'OJ-MediaMetadata/1.0' },
  });

  if (!response.ok) {
    throw new AppError(`YouTube metadata probe failed with HTTP ${response.status}`, 422);
  }

  const data = (await response.json()) as {
    items?: Array<{ contentDetails?: { duration?: string } }>;
  };
  const duration = data.items?.[0]?.contentDetails?.duration;
  if (!duration) {
    throw new AppError('YouTube metadata probe returned no duration', 422);
  }

  const durationSeconds = parseIso8601DurationSeconds(duration);
  if (!durationSeconds) {
    throw new AppError('YouTube metadata duration could not be parsed', 422);
  }

  return {
    durationSeconds,
    mediaKind: 'video',
    provider: 'youtube',
    probedAt: new Date().toISOString(),
  };
}

export async function probeMediaUrl(url: string, kind: MediaKind): Promise<MediaProbeResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new AppError('Media URL is required for probing', 400);
  }

  if (kind === 'video' && parseYoutubeId(trimmed)) {
    return probeYoutubeUrl(trimmed);
  }

  const { stream, mimeType: responseMimeType, provider } = await fetchMediaStream(trimmed);
  const metadata = await parseStream(
    stream,
    responseMimeType ? { mimeType: responseMimeType } : undefined,
    {
      duration: true,
    }
  );

  const durationSeconds =
    metadata.format.duration != null && Number.isFinite(metadata.format.duration)
      ? Math.max(0, Math.round(metadata.format.duration))
      : undefined;

  return {
    durationSeconds,
    mimeType: responseMimeType ?? metadata.format.container,
    bitrate: metadata.format.bitrate,
    sampleRate: metadata.format.sampleRate,
    codec: metadata.format.codec,
    container: metadata.format.container,
    provider,
    mediaKind: kind,
    probedAt: new Date().toISOString(),
  };
}

export async function updateEntityMetadata(
  entityType: MediaMetadataEntityType,
  entityId: string,
  patch: MediaMetadataPatch
): Promise<void> {
  if (!mongoose.isValidObjectId(entityId)) {
    throw new AppError('Invalid entity id for metadata update', 400);
  }

  const setFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      setFields[`metadata.${key}`] = value;
    }
  }

  if (Object.keys(setFields).length === 0) return;

  const updated =
    entityType === 'music'
      ? await Music.findByIdAndUpdate(entityId, { $set: setFields }).exec()
      : await Video.findByIdAndUpdate(entityId, { $set: setFields }).exec();

  if (!updated) {
    throw new AppError(`${entityType === 'music' ? 'Music' : 'Video'} not found`, 404);
  }
}
