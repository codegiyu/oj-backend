import { mergePublicFilter } from './contentCompleteness';

export function buildRegex(q: string): RegExp {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

/** Strip characters that break MongoDB $text queries. */
export function sanitizeTextSearchQuery(q: string): string | null {
  const trimmed = q.trim();
  if (!trimmed) return null;

  const sanitized = trimmed
    .replace(/[^\w\s\-"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return sanitized.length > 0 ? sanitized : null;
}

/** MongoDB text indexes ignore tokens shorter than the default min word length (3). */
export function shouldUseTextSearch(q: string): boolean {
  const sanitized = sanitizeTextSearchQuery(q);
  if (!sanitized) return false;

  return sanitized.split(/\s+/).some(token => token.replace(/[^\w]/g, '').length >= 3);
}

export function buildTextSearchClause(q: string): { $text: { $search: string } } | null {
  const sanitized = sanitizeTextSearchQuery(q);
  if (!sanitized || !shouldUseTextSearch(sanitized)) return null;

  return { $text: { $search: sanitized } };
}

export function buildRegexSearchClause(
  q: string,
  fields: string[]
): { $or: Record<string, RegExp>[] } {
  const regex = buildRegex(q);

  return {
    $or: fields.map(field => ({ [field]: regex })),
  };
}

export function mergeSearchIntoFilter(
  baseFilter: Record<string, unknown>,
  q: string,
  fields: string[],
  options?: { forceTextSearch?: boolean }
): Record<string, unknown> {
  const textClause = buildTextSearchClause(q);

  if (textClause) {
    return mergePublicFilter(baseFilter, textClause);
  }

  if (options?.forceTextSearch) {
    return baseFilter;
  }

  return mergePublicFilter(baseFilter, buildRegexSearchClause(q, fields));
}
