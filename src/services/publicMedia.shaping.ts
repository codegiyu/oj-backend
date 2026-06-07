import { toArtistSummary, type PopulatedArtistDoc } from '../controllers/artist/artist.helpers';
import type { MediaMetadata } from '../lib/types/constants';
import { leanIdToString } from '../utils/leanId';
import { youtubeEmbedUrlFromInput, isLikelyYoutubeUrl } from '../utils/videoEmbed';
import { albumApiFieldsFromRaw } from '../utils/albumSummary';

function tagsFromRaw(raw: Record<string, unknown>): string[] | undefined {
  if (!Array.isArray(raw.tags) || raw.tags.length === 0) return undefined;

  return raw.tags.filter((t): t is string => typeof t === 'string');
}

function durationFromMetadata(metadata: unknown): number | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;

  const seconds = (metadata as MediaMetadata).durationSeconds;

  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return undefined;

  return seconds;
}

function priorityFromRaw(raw: Record<string, unknown>): number | undefined {
  const priority = raw.priority;

  if (typeof priority !== 'number' || !Number.isInteger(priority)) return undefined;

  return priority;
}

function mediaTaxonomyFields(raw: Record<string, unknown>): Record<string, unknown> {
  const tags = tagsFromRaw(raw);
  const duration = durationFromMetadata(raw.metadata);

  return {
    ...(tags && { tags }),
    ...(duration !== undefined && { duration }),
  };
}

function newsTaxonomyFields(raw: Record<string, unknown>): Record<string, unknown> {
  const tags = tagsFromRaw(raw);
  const priority = priorityFromRaw(raw);

  return {
    ...(tags && { tags }),
    ...(priority !== undefined && { priority }),
  };
}

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
    ...mediaTaxonomyFields(raw),
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
    ...mediaTaxonomyFields(raw),
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
    ...mediaTaxonomyFields(raw),
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
    ...mediaTaxonomyFields(raw),
    ...(artist && { artist }),
  };
}

function newsListExcerpt(raw: Record<string, unknown>): string {
  const stored = typeof raw.excerpt === 'string' ? raw.excerpt.trim() : '';
  if (stored) return stored;

  const content = typeof raw.content === 'string' ? raw.content.trim() : '';

  return content ? content.slice(0, 160) : '';
}

export function shapeArticleListItem(raw: Record<string, unknown>): Record<string, unknown> {
  const excerpt = newsListExcerpt(raw);

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    excerpt,
    category: raw.category,
    coverImage: raw.coverImage,
    author: raw.author,
    views: raw.views ?? 0,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    ...newsTaxonomyFields(raw),
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
    ...newsTaxonomyFields(raw),
  };
}
