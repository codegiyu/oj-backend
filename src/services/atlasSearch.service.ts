import { ENVIRONMENT } from '../config/env';
import {
  runPublicSearch,
  type PublicSearchOptions,
  type SearchResponsePayload,
} from './publicSearch.service';

export function isAtlasSearchEnabled(): boolean {
  return ENVIRONMENT.search.useAtlasSearch;
}

/**
 * Atlas Search rollout entry point. When enabled, routes public search through
 * text-index-only queries until federated Atlas Search indexes are provisioned.
 */
export async function runAtlasBackedSearch(
  options: PublicSearchOptions
): Promise<SearchResponsePayload | null> {
  if (!isAtlasSearchEnabled()) {
    return null;
  }

  return runPublicSearch({ ...options, forceTextSearch: true });
}
