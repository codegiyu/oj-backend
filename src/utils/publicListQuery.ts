import { PUBLIC_LIST_DEFAULT_LIMIT, PUBLIC_LIST_MAX_LIMIT } from '../constants/pagination';
import { mergePublicFilter } from './contentCompleteness';
import { parsePositiveInteger, parseSearch, parseString } from './helpers';

export type PublicListSort = 'newest' | 'popular' | 'featured';

export const PUBLIC_LIST_SORT_VALUES = ['newest', 'popular', 'featured'] as const;

export type PopularSortField =
  | 'views'
  | 'plays'
  | 'downloads'
  | 'totalVotes'
  | 'prayers'
  | 'upvotes'
  | 'likes';

export type ParsedPublicListQuery = {
  q: string | undefined;
  sort: PublicListSort;
  sortPreset: PublicListSort;
  mongoSort: Record<string, 1 | -1>;
  page: number;
  limit: number;
  skip: number;
};

export type ResolvedListSortOptions = {
  sort: Record<string, 1 | -1>;
  featuredFilter?: boolean;
  useTrending?: boolean;
};

/** Escape user input for safe use inside a MongoDB `$regex` pattern. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Add case-insensitive OR search across the given string fields. */
export function applyTextSearch(
  filter: Record<string, unknown>,
  q: string | undefined,
  fields: string[]
): Record<string, unknown> {
  const term = parseSearch(q);
  if (!term || fields.length === 0) return filter;

  const pattern = escapeRegex(term);
  const searchClause = {
    $or: fields.map(field => ({
      [field]: { $regex: pattern, $options: 'i' },
    })),
  };

  if (Object.keys(filter).length === 0) return searchClause;

  return mergePublicFilter(filter, searchClause);
}

export function parseListSort(sort: unknown): PublicListSort {
  const value = parseString(sort);
  if (value === 'popular' || value === 'featured') return value;

  return 'newest';
}

export function resolveListSortOptions(sort: unknown): ResolvedListSortOptions {
  const mode = parseListSort(sort);

  if (mode === 'popular') {
    return { sort: { createdAt: -1 }, useTrending: false };
  }

  if (mode === 'featured') {
    return {
      sort: { displayOrder: 1, createdAt: -1 },
      featuredFilter: true,
    };
  }

  return { sort: { createdAt: -1 } };
}

export function applyFeaturedListFilter(
  filter: Record<string, unknown>,
  sortPreset: PublicListSort
): Record<string, unknown> {
  if (sortPreset !== 'featured') return filter;

  return mergePublicFilter(filter, { isFeatured: true });
}

export function withPopularSortField(
  _base: Record<string, 1 | -1>,
  field: PopularSortField | (string & {})
): Record<string, 1 | -1> {
  return { [field]: -1, createdAt: -1 };
}

export function parseListQueryParams(query: {
  q?: string;
  sort?: string;
  page?: string;
  limit?: string;
}): ParsedPublicListQuery {
  const page = parsePositiveInteger(query.page, 1, 1000);
  const limit = parsePositiveInteger(query.limit, PUBLIC_LIST_DEFAULT_LIMIT, PUBLIC_LIST_MAX_LIMIT);
  const sortPreset = parseListSort(query.sort);
  const { sort: mongoSort } = resolveListSortOptions(query.sort);

  return {
    q: parseSearch(query.q),
    sort: sortPreset,
    sortPreset,
    mongoSort,
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

/** Devotional `type=latest|popular` are sort modes, not content-type filters. */
export function isDevotionalSortType(type: string | undefined): boolean {
  return type === 'latest' || type === 'popular';
}
