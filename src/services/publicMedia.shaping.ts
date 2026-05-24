import { toArtistSummary, type PopulatedArtistDoc } from '../controllers/artist/artist.helpers';
import { leanIdToString } from '../utils/leanId';
import { youtubeEmbedUrlFromInput, isLikelyYoutubeUrl } from '../utils/videoEmbed';
import { albumApiFieldsFromRaw } from '../utils/albumSummary';

export function shapeMusicListItem(
  raw: Record<string, unknown>,
  index: number,
  type: string
): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as PopulatedArtistDoc);

  const item: Record<string, unknown> = {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    coverImage: raw.coverImage,
    excerpt: raw.excerpt ?? '',
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    category: raw.category,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    ...(artist && { artist }),
  };

  if (type === 'charts') {
    item.chartPosition = index + 1;
    item.rank = index + 1;
  }

  Object.assign(item, albumApiFieldsFromRaw(raw, { requirePublished: true }));

  return item;
}

export function shapeMusicDetail(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as PopulatedArtistDoc);
  const videoUrlStr = typeof raw.videoUrl === 'string' ? raw.videoUrl : '';

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    lyrics: raw.lyrics,
    excerpt: raw.excerpt ?? '',
    coverImage: raw.coverImage,
    audioUrl: raw.audioUrl,
    videoUrl: raw.videoUrl,
    downloadUrl: raw.downloadUrl ?? '',
    category: raw.category,
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    downloads: raw.downloads ?? 0,
    isMonetizable: Boolean(raw.isMonetizable),
    price: typeof raw.price === 'number' ? raw.price : Number(raw.price) || 0,
    youtubeEmbedUrl: youtubeEmbedUrlFromInput(videoUrlStr),
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    ...(artist && { artist }),
    ...albumApiFieldsFromRaw(raw, { requirePublished: true }),
  };
}

export function shapeVideoListItem(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as PopulatedArtistDoc);

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    thumbnail: raw.thumbnail,
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    downloads: raw.downloads ?? 0,
    category: raw.category,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    ...(artist && { artist }),
  };
}

export function shapeVideoDetail(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as PopulatedArtistDoc);
  const legacyUrl = typeof raw.videoUrl === 'string' ? raw.videoUrl : '';
  const fileFromField = typeof raw.videoFileUrl === 'string' ? raw.videoFileUrl.trim() : '';
  const videoFileUrl =
    fileFromField || (legacyUrl && !isLikelyYoutubeUrl(legacyUrl) ? legacyUrl : '');
  const embedField = typeof raw.embedUrl === 'string' ? raw.embedUrl.trim() : '';
  const embedUrl = embedField || (legacyUrl && isLikelyYoutubeUrl(legacyUrl) ? legacyUrl : '');

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    description: raw.description,
    thumbnail: raw.thumbnail,
    videoUrl: raw.videoUrl,
    videoFileUrl,
    embedUrl,
    youtubeEmbedUrl: youtubeEmbedUrlFromInput(embedUrl),
    category: raw.category,
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    downloads: raw.downloads ?? 0,
    isMonetizable: Boolean(raw.isMonetizable),
    price: typeof raw.price === 'number' ? raw.price : Number(raw.price) || 0,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    ...(artist && { artist }),
  };
}

export function shapeArticleListItem(raw: Record<string, unknown>): Record<string, unknown> {
  const excerpt = raw.excerpt ?? (typeof raw.content === 'string' ? raw.content.slice(0, 160) : '');

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    excerpt: excerpt || raw.excerpt,
    category: raw.category,
    coverImage: raw.coverImage,
    author: raw.author,
    views: raw.views ?? 0,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
  };
}

export function shapeArticleDetail(raw: Record<string, unknown>): Record<string, unknown> {
  const embedRaw = typeof raw.embedUrl === 'string' ? raw.embedUrl : '';

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    content: raw.content,
    excerpt: raw.excerpt,
    coverImage: raw.coverImage,
    images: Array.isArray(raw.images) ? raw.images : [],
    audioUrl: raw.audioUrl ?? '',
    videoFileUrl: raw.videoFileUrl ?? '',
    embedUrl: embedRaw,
    downloadUrl: raw.downloadUrl ?? '',
    youtubeEmbedUrl: youtubeEmbedUrlFromInput(embedRaw),
    category: raw.category,
    author: raw.author,
    hasVideo: raw.hasVideo ?? false,
    views: raw.views ?? 0,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}
