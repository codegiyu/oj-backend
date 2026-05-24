import { leanIdToString } from './leanId';

export type AlbumSummary = {
  _id: string;
  title: string;
  slug?: string;
};

type AlbumLean = {
  _id: unknown;
  title?: string;
  slug?: string;
  status?: string;
};

export function toAlbumSummary(
  albumVal: unknown,
  options?: { requirePublished?: boolean }
): AlbumSummary | undefined {
  if (albumVal == null) return undefined;

  if (typeof albumVal === 'object' && albumVal !== null && '_id' in albumVal) {
    const a = albumVal as AlbumLean;

    if (options?.requirePublished && a.status && a.status !== 'published') {
      return undefined;
    }

    return {
      _id: leanIdToString(a._id),
      title: a.title ?? 'Untitled album',
      ...(a.slug ? { slug: a.slug } : {}),
    };
  }

  return undefined;
}

export function albumApiFieldsFromRaw(
  raw: Record<string, unknown>,
  options?: { requirePublished?: boolean }
): { albumId?: string; album?: AlbumSummary } {
  const album = toAlbumSummary(raw.album, options);

  if (album) {
    return { albumId: album._id, album };
  }

  if (raw.album != null && (typeof raw.album !== 'object' || !('_id' in raw.album))) {
    return { albumId: leanIdToString(raw.album) };
  }

  return {};
}
