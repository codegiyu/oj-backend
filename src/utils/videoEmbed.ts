/**
 * Parse YouTube watch / youtu.be URLs into an embed-friendly ID and URL.
 */

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

export function parseYoutubeId(input: string | undefined | null): string | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (YOUTUBE_HOSTS.has(host) || host.endsWith('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const parts = u.pathname.split('/').filter(Boolean);
      const embedIdx = parts.indexOf('embed');
      if (embedIdx >= 0 && parts[embedIdx + 1] && /^[\w-]{11}$/.test(parts[embedIdx + 1])) {
        return parts[embedIdx + 1];
      }
      const shortIdx = parts.indexOf('shorts');
      if (shortIdx >= 0 && parts[shortIdx + 1] && /^[\w-]{11}$/.test(parts[shortIdx + 1])) {
        return parts[shortIdx + 1];
      }
    }
  } catch {
    const m = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
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
