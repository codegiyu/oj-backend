/**
 * Parse YouTube watch / youtu.be URLs into an embed-friendly ID and URL.
 * Also normalize hosted-file vs embed fields for video writes and public shaping.
 */

const YOUTUBE_ID_RE = /^[\w-]{11}$/;

/** Loose Mongo-friendly pattern for YouTube page/embed URLs with an 11-char id. */
export const YOUTUBE_URL_MONGO_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)[\w-]{11}/i;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

function isYoutubeHost(host: string): boolean {
  const normalized = host.replace(/^www\./, '');

  return (
    YOUTUBE_HOSTS.has(host) ||
    YOUTUBE_HOSTS.has(normalized) ||
    normalized.endsWith('youtube.com') ||
    normalized.endsWith('youtube-nocookie.com')
  );
}

function pathSegmentId(parts: string[], marker: string): string | null {
  const idx = parts.indexOf(marker);

  if (idx < 0 || !parts[idx + 1] || !YOUTUBE_ID_RE.test(parts[idx + 1])) return null;

  return parts[idx + 1];
}

export function parseYoutubeId(input: string | undefined | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = u.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];

      return id && YOUTUBE_ID_RE.test(id) ? id : null;
    }

    if (isYoutubeHost(u.hostname)) {
      const v = u.searchParams.get('v');
      if (v && YOUTUBE_ID_RE.test(v)) return v;

      const parts = u.pathname.split('/').filter(Boolean);

      return (
        pathSegmentId(parts, 'embed') ||
        pathSegmentId(parts, 'shorts') ||
        pathSegmentId(parts, 'live')
      );
    }
  } catch {
    const m = trimmed.match(
      /(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/
    );

    return m?.[1] ?? null;
  }

  return null;
}

export function youtubeEmbedUrlFromInput(input: string | undefined | null): string | null {
  const id = parseYoutubeId(input);

  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export function isLikelyYoutubeUrl(input: string | undefined | null): boolean {
  return parseYoutubeId(input) != null;
}

export type VideoMediaFieldsInput = {
  videoFileUrl?: string | null;
  embedUrl?: string | null;
  videoUrl?: string | null;
};

export type ResolvedVideoMediaFields = {
  videoFileUrl: string;
  embedUrl: string;
  videoUrl: string;
};

/**
 * Resolve hosted file vs YouTube embed fields.
 * YouTube pasted into videoFileUrl or legacy videoUrl moves into embedUrl.
 * Parseable YouTube in file/legacy wins over a non-YouTube embedUrl.
 */
export function resolveVideoMediaFields(input: VideoMediaFieldsInput): ResolvedVideoMediaFields {
  const fileIn = (input.videoFileUrl ?? '').trim();
  const embedIn = (input.embedUrl ?? '').trim();
  const legacyIn = (input.videoUrl ?? '').trim();

  const fileIsYt = isLikelyYoutubeUrl(fileIn);
  const embedIsYt = isLikelyYoutubeUrl(embedIn);
  const legacyIsYt = isLikelyYoutubeUrl(legacyIn);

  let videoFileUrl = '';
  let embedUrl = '';

  if (embedIsYt) {
    embedUrl = embedIn;
  } else if (fileIsYt) {
    embedUrl = fileIn;
  } else if (legacyIsYt) {
    embedUrl = legacyIn;
  } else if (embedIn) {
    embedUrl = embedIn;
  }

  if (fileIn && !fileIsYt) {
    videoFileUrl = fileIn;
  } else if (!fileIn && legacyIn && !legacyIsYt) {
    videoFileUrl = legacyIn;
  }

  const videoUrl = videoFileUrl || embedUrl || legacyIn;

  return { videoFileUrl, embedUrl, videoUrl };
}
