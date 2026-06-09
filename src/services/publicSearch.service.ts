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
import { mergeSearchIntoFilter, shouldUseTextSearch } from '../utils/searchQuery';

export type PublicSearchOptions = {
  q: string;
  typeFilter?: string;
  page: number;
  limit: number;
  /** Skip regex fallback — used when USE_ATLAS_SEARCH routes through text indexes only. */
  forceTextSearch?: boolean;
};

function buildSearchFilter(
  baseFilter: Record<string, unknown>,
  q: string,
  fields: string[],
  forceTextSearch?: boolean
): Record<string, unknown> {
  return mergeSearchIntoFilter(baseFilter, q, fields, { forceTextSearch });
}

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

async function fetchMusicResults(
  q: string,
  forceTextSearch?: boolean
): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchMusicDocuments(
    buildSearchFilter(
      mergePublicFilter({ status: 'published' }, publishedMusicCompletenessFilter()),
      q,
      ['title', 'description', 'category'],
      forceTextSearch
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

async function fetchAlbumResults(
  q: string,
  forceTextSearch?: boolean
): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchAlbumDocuments(
    buildSearchFilter(
      { status: 'published' },
      q,
      ['title', 'description', 'excerpt'],
      forceTextSearch
    ),
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

async function fetchNewsResults(q: string, forceTextSearch?: boolean): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchNewsDocuments(
    buildSearchFilter(
      mergePublicFilter({ status: 'published' }, publishedTextContentCompletenessFilter()),
      q,
      ['title', 'category', 'content'],
      forceTextSearch
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

async function fetchVideoResults(
  q: string,
  forceTextSearch?: boolean
): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchVideoDocuments(
    buildSearchFilter(
      mergePublicFilter({ status: 'published' }, publishedVideoCompletenessFilter()),
      q,
      ['title', 'description', 'category'],
      forceTextSearch
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

async function fetchDevotionalResults(
  q: string,
  forceTextSearch?: boolean
): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchDevotionalDocuments(
    buildSearchFilter(
      mergePublicFilter({ status: 'published' }, publishedTextContentCompletenessFilter()),
      q,
      ['title', 'excerpt', 'content', 'category', 'author'],
      forceTextSearch
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

async function fetchTestimonyResults(
  q: string,
  forceTextSearch?: boolean
): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchTestimonyDocuments(
    buildSearchFilter(
      mergePublicFilter({ status: 'published' }, publishedTextContentCompletenessFilter()),
      q,
      ['content', 'author', 'category'],
      forceTextSearch
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

async function fetchPrayerRequestResults(
  q: string,
  forceTextSearch?: boolean
): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchPrayerRequestDocuments(
    buildSearchFilter(
      mergePublicFilter({}, publishedTextContentCompletenessFilter()),
      q,
      ['title', 'content', 'author', 'category'],
      forceTextSearch
    ),
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

async function fetchQuestionResults(
  q: string,
  forceTextSearch?: boolean
): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchQuestionDocuments(
    buildSearchFilter(
      { isPrivate: { $ne: true } },
      q,
      ['question', 'author', 'category'],
      forceTextSearch
    ),
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

async function fetchPollResults(q: string, forceTextSearch?: boolean): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchPollDocuments(
    buildSearchFilter(
      { status: 'active' },
      q,
      ['question', 'description', 'category'],
      forceTextSearch
    ),
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

async function fetchArtistResults(
  q: string,
  forceTextSearch?: boolean
): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchArtistDocuments(
    buildSearchFilter(
      { profileStatus: 'active', isActive: true },
      q,
      ['name', 'genre', 'bio'],
      forceTextSearch
    ),
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

async function fetchResourceResults(
  q: string,
  forceTextSearch?: boolean
): Promise<SearchResultItem[]> {
  const docs = await searchRepo.searchResourceDocuments(
    buildSearchFilter(
      mergePublicFilter({ status: 'published' }, publishedResourceCompletenessFilter()),
      q,
      ['title', 'description', 'type', 'category'],
      forceTextSearch
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

export async function runPublicSearch(
  options: PublicSearchOptions
): Promise<SearchResponsePayload> {
  const { q, typeFilter, page, limit, forceTextSearch } = options;

  if (!q) {
    return {
      results: [],
      pagination: buildSearchPagination(0, 1, limit, 0),
    };
  }

  if (forceTextSearch && !shouldUseTextSearch(q)) {
    const searchTypes = resolveSearchTypes(typeFilter);

    return {
      results: [],
      pagination: buildSearchPagination(0, page, limit, searchTypes.length),
    };
  }

  const searchTypes = resolveSearchTypes(typeFilter);

  const fetchTasks = searchTypes.map(type => {
    switch (type) {
      case 'music':
        return fetchMusicResults(q, forceTextSearch);
      case 'album':
        return fetchAlbumResults(q, forceTextSearch);
      case 'news':
        return fetchNewsResults(q, forceTextSearch);
      case 'video':
        return fetchVideoResults(q, forceTextSearch);
      case 'devotional':
        return fetchDevotionalResults(q, forceTextSearch);
      case 'testimony':
        return fetchTestimonyResults(q, forceTextSearch);
      case 'prayer-request':
        return fetchPrayerRequestResults(q, forceTextSearch);
      case 'question':
        return fetchQuestionResults(q, forceTextSearch);
      case 'poll':
        return fetchPollResults(q, forceTextSearch);
      case 'artist':
        return fetchArtistResults(q, forceTextSearch);
      case 'resource':
        return fetchResourceResults(q, forceTextSearch);
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
