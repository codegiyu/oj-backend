import dns from 'node:dns/promises';
import { isIP } from 'node:net';
import { Readable } from 'node:stream';
import mongoose from 'mongoose';
import { parseStream } from 'music-metadata';
import type { MediaMetadataEntityType, MediaKind } from '../lib/types/queues';
import { Music } from '../models/music';
import { Video } from '../models/video';
import { AppError } from '../utils/AppError';

export const MEDIA_PROBE_TIMEOUT_MS = 15_000;

export interface MediaProbeResult {
  durationSeconds?: number;
  mimeType?: string;
  bitrate?: number;
  sampleRate?: number;
  codec?: string;
  container?: string;
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

async function fetchMediaStream(url: string): Promise<{ stream: Readable; mimeType?: string }> {
  await assertSafeMediaUrl(url);

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
  };
}

export async function probeMediaUrl(url: string, kind: MediaKind): Promise<MediaProbeResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new AppError('Media URL is required for probing', 400);
  }

  const { stream, mimeType: responseMimeType } = await fetchMediaStream(trimmed);
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
