/**
 * Unified public search — parallel collection queries with capped in-memory pagination.
 */

import * as searchRepo from '../repositories/public/search.repository';
import { toArtistSummary } from '../controllers/artist/artist.helpers';
import type { PopulatedArtistDoc } from '../controllers/artist/artist.helpers';
import {
  isCompleteDevotional,
  isCompleteMusic,
  isCompleteNewsArticle,
  isCompletePrayerRequest,
  isCompleteResource,
  isCompleteTestimony,
  isCompleteVideo,
  mergePublicFilter,
  publishedMusicCompletenessFilter,
  publishedResourceCompletenessFilter,
  publishedTextContentCompletenessFilter,
  publishedVideoCompletenessFilter,
} from '../utils/contentCompleteness';
import { leanIdToString } from '../utils/leanId';
import { mergeSearchIntoFilter } from '../utils/searchQuery';

export const SEARCH_DEFAULT_LIMIT = 24;
export const SEARCH_MAX_LIMIT = 50;
export const SEARCH_PER_TYPE_LIMIT = 30;

export type SearchResultItem = {
  _id: string;
  title: string;
  subtitle: string;
  type: string;
  image?: string;
  meta: string;
};

export type SearchPagination = {
  page: number;
  limit: number;
  /** Matches loaded into memory (capped per type), not a full DB count. */
  loaded: number;
  totalPages: number;
  isCapped: boolean;
};

export type SearchResponsePayload = {
  results: SearchResultItem[];
  pagination: SearchPagination;
};

/** Safe display string for lean search documents (avoids [object Object] stringification). */
function searchDisplayStr(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();

  return '';
}

export function buildSearchPagination(
  loaded: number,
  page: number,
  limit: number,
  searchTypeCount: number
): SearchPagination {
  const maxLoadable = searchTypeCount * SEARCH_PER_TYPE_LIMIT;

  return {
    page,
    limit,
    loaded,
    totalPages: loaded > 0 ? Math.ceil(loaded / limit) : 0,
    isCapped: searchTypeCount > 0 && loaded >= maxLoadable,
  };
}

async function fetchMusicResults(q: string): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchMusicDocuments(
    mergeSearchIntoFilter(
      mergePublicFilter({ status: 'published' }, publishedMusicCompletenessFilter()),
      q,
      ['title', 'description', 'category']
    ),
    SEARCH_PER_TYPE_LIMIT
  );

  const results: SearchResultItem[] = [];

  for (const doc of docs as unknown as Record<string, unknown>[]) {
    if (!isCompleteMusic(doc)) continue;
    const artist = toArtistSummary(doc.artist as PopulatedArtistDoc);
    results.push({
      _id: leanIdToString(doc._id),
      title: searchDisplayStr(doc.title),
      subtitle: artist?.name ?? '',
      type: 'music',
      image: doc.coverImage as string | undefined,
      meta: searchDisplayStr(doc.plays) || searchDisplayStr(doc.duration),
    });
  }

  return results;
}

async function fetchAlbumResults(q: string): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchAlbumDocuments(
    mergeSearchIntoFilter({ status: 'published' }, q, ['title', 'description', 'excerpt']),
    SEARCH_PER_TYPE_LIMIT
  );

  return (docs as unknown as Record<string, unknown>[]).map(doc => {
    const artist = toArtistSummary(doc.artist as PopulatedArtistDoc);

    return {
      _id: leanIdToString(doc._id),
      title: searchDisplayStr(doc.title),
      subtitle: artist?.name ?? '',
      type: 'album',
      image: doc.coverImage as string | undefined,
      meta: searchDisplayStr(doc.releaseDate),
    };
  });
}

async function fetchNewsResults(q: string): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchNewsDocuments(
    mergeSearchIntoFilter(
      mergePublicFilter({ status: 'published' }, publishedTextContentCompletenessFilter()),
      q,
      ['title', 'category', 'content']
    ),
    SEARCH_PER_TYPE_LIMIT
  );

  const results: SearchResultItem[] = [];

  for (const doc of docs as unknown as Record<string, unknown>[]) {
    if (!isCompleteNewsArticle(doc)) continue;
    results.push({
      _id: leanIdToString(doc._id),
      title: searchDisplayStr(doc.title),
      subtitle: searchDisplayStr(doc.category),
      type: 'news',
      image: doc.image as string | undefined,
      meta: searchDisplayStr(doc.readTime),
    });
  }

  return results;
}

async function fetchVideoResults(q: string): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchVideoDocuments(
    mergeSearchIntoFilter(
      mergePublicFilter({ status: 'published' }, publishedVideoCompletenessFilter()),
      q,
      ['title', 'description', 'category']
    ),
    SEARCH_PER_TYPE_LIMIT
  );

  const results: SearchResultItem[] = [];

  for (const doc of docs as unknown as Record<string, unknown>[]) {
    if (!isCompleteVideo(doc)) continue;
    const artist = toArtistSummary(doc.artist as PopulatedArtistDoc);
    results.push({
      _id: leanIdToString(doc._id),
      title: searchDisplayStr(doc.title),
      subtitle: artist?.name ?? '',
      type: 'video',
      image: doc.thumbnail as string | undefined,
      meta: searchDisplayStr(doc.duration) || searchDisplayStr(doc.views),
    });
  }

  return results;
}

async function fetchDevotionalResults(q: string): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchDevotionalDocuments(
    mergeSearchIntoFilter(
      mergePublicFilter({ status: 'published' }, publishedTextContentCompletenessFilter()),
      q,
      ['title', 'excerpt', 'content', 'category', 'author']
    ),
    SEARCH_PER_TYPE_LIMIT
  );

  const results: SearchResultItem[] = [];

  for (const doc of docs as unknown as Record<string, unknown>[]) {
    if (!isCompleteDevotional(doc)) continue;
    results.push({
      _id: leanIdToString(doc._id),
      title: searchDisplayStr(doc.title),
      subtitle: searchDisplayStr(doc.category) || searchDisplayStr(doc.author),
      type: 'devotional',
      meta: searchDisplayStr(doc.readingTime) || searchDisplayStr(doc.date),
    });
  }

  return results;
}

async function fetchTestimonyResults(q: string): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchTestimonyDocuments(
    mergeSearchIntoFilter(
      mergePublicFilter({ status: 'published' }, publishedTextContentCompletenessFilter()),
      q,
      ['content', 'author', 'category']
    ),
    SEARCH_PER_TYPE_LIMIT
  );

  const results: SearchResultItem[] = [];

  for (const doc of docs as unknown as Record<string, unknown>[]) {
    if (!isCompleteTestimony(doc)) continue;
    const testimonyPreview = typeof doc.content === 'string' ? doc.content.slice(0, 60) : '';

    results.push({
      _id: leanIdToString(doc._id),
      title: testimonyPreview || searchDisplayStr(doc.author),
      subtitle: searchDisplayStr(doc.author),
      type: 'testimony',
      image: doc.avatar as string | undefined,
      meta: searchDisplayStr(doc.category),
    });
  }

  return results;
}

async function fetchPrayerRequestResults(q: string): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchPrayerRequestDocuments(
    mergeSearchIntoFilter(mergePublicFilter({}, publishedTextContentCompletenessFilter()), q, [
      'title',
      'content',
      'author',
      'category',
    ]),
    SEARCH_PER_TYPE_LIMIT
  );

  const results: SearchResultItem[] = [];

  for (const doc of docs as unknown as Record<string, unknown>[]) {
    if (!isCompletePrayerRequest(doc)) continue;
    results.push({
      _id: leanIdToString(doc._id),
      title: searchDisplayStr(doc.title),
      subtitle: searchDisplayStr(doc.author),
      type: 'prayer-request',
      meta: searchDisplayStr(doc.category),
    });
  }

  return results;
}

async function fetchQuestionResults(q: string): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchQuestionDocuments(
    mergeSearchIntoFilter({ isPrivate: { $ne: true } }, q, ['question', 'author', 'category']),
    SEARCH_PER_TYPE_LIMIT
  );

  return (docs as unknown as Record<string, unknown>[]).map(doc => ({
    _id: leanIdToString(doc._id),
    title: searchDisplayStr(doc.question),
    subtitle: searchDisplayStr(doc.author),
    type: 'question',
    meta: searchDisplayStr(doc.category),
  }));
}

async function fetchPollResults(q: string): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchPollDocuments(
    mergeSearchIntoFilter({ status: 'active' }, q, ['question', 'description', 'category']),
    SEARCH_PER_TYPE_LIMIT
  );

  return (docs as unknown as Record<string, unknown>[]).map(doc => {
    const totalVotesRaw = Number(doc.totalVotes);
    const totalVotes = Number.isFinite(totalVotesRaw) ? totalVotesRaw : 0;

    return {
      _id: leanIdToString(doc._id),
      title: searchDisplayStr(doc.question),
      subtitle: searchDisplayStr(doc.category),
      type: 'poll',
      meta: `${totalVotes} votes`,
    };
  });
}

async function fetchArtistResults(q: string): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchArtistDocuments(
    mergeSearchIntoFilter({ profileStatus: 'active', isActive: true }, q, ['name', 'genre', 'bio']),
    SEARCH_PER_TYPE_LIMIT
  );

  return (docs as unknown as Record<string, unknown>[]).map(doc => ({
    _id: leanIdToString(doc._id),
    title: searchDisplayStr(doc.name),
    subtitle: searchDisplayStr(doc.genre),
    type: 'artist',
    image: doc.image as string | undefined,
    meta: '',
  }));
}

async function fetchResourceResults(q: string): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchResourceDocuments(
    mergeSearchIntoFilter(
      mergePublicFilter({ status: 'published' }, publishedResourceCompletenessFilter()),
      q,
      ['title', 'description', 'type', 'category']
    ),
    SEARCH_PER_TYPE_LIMIT
  );

  const results: SearchResultItem[] = [];

  for (const doc of docs as unknown as Record<string, unknown>[]) {
    if (!isCompleteResource(doc)) continue;
    results.push({
      _id: leanIdToString(doc._id),
      title: searchDisplayStr(doc.title),
      subtitle: searchDisplayStr(doc.type) || searchDisplayStr(doc.category),
      type: 'resource',
      image: (doc.coverImage ?? doc.cover) as string | undefined,
      meta: searchDisplayStr(doc.downloads),
    });
  }

  return results;
}

const COMMUNITY_TYPES = [
  'devotional',
  'testimony',
  'prayer-request',
  'question',
  'poll',
  'artist',
  'resource',
] as const;

function resolveSearchTypes(typeFilter?: string): string[] {
  if (!typeFilter) {
    return ['music', 'album', 'news', 'video', ...COMMUNITY_TYPES];
  }

  if (typeFilter === 'community') {
    return [...COMMUNITY_TYPES];
  }

  return [typeFilter];
}

export async function runPublicSearch(options: {
  q: string;
  typeFilter?: string;
  page: number;
  limit: number;
}): Promise<SearchResponsePayload> {
  const { q, typeFilter, page, limit } = options;

  if (!q) {
    return {
      results: [],
      pagination: buildSearchPagination(0, 1, limit, 0),
    };
  }

  const searchTypes = resolveSearchTypes(typeFilter);

  const fetchTasks = searchTypes.map(type => {
    switch (type) {
      case 'music':
        return fetchMusicResults(q);
      case 'album':
        return fetchAlbumResults(q);
      case 'news':
        return fetchNewsResults(q);
      case 'video':
        return fetchVideoResults(q);
      case 'devotional':
        return fetchDevotionalResults(q);
      case 'testimony':
        return fetchTestimonyResults(q);
      case 'prayer-request':
        return fetchPrayerRequestResults(q);
      case 'question':
        return fetchQuestionResults(q);
      case 'poll':
        return fetchPollResults(q);
      case 'artist':
        return fetchArtistResults(q);
      case 'resource':
        return fetchResourceResults(q);
      default:
        return Promise.resolve([]);
    }
  });

  const resultGroups = await Promise.all(fetchTasks);
  const results = resultGroups.flat();
  const loaded = results.length;
  const skip = (page - 1) * limit;
  const paginated = results.slice(skip, skip + limit);

  return {
    results: paginated,
    pagination: buildSearchPagination(loaded, page, limit, searchTypes.length),
  };
}
