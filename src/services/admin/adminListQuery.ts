import { parsePositiveInteger, parseSearch, parseString, normalizeSort } from '../../utils/helpers';

export type AdminListQuery = {
  page: number;
  limit: number;
  skip: number;
  filter: Record<string, unknown>;
  sort: string;
};

export function parseAdminListQuery(
  query: {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    sort?: string;
  },
  options: {
    sortFields: string[];
    defaultSort?: string;
    searchFields?: string[];
    defaultLimit?: number;
    maxLimit?: number;
  }
): AdminListQuery {
  const page = parsePositiveInteger(query.page, 1, 1000);
  const limit = parsePositiveInteger(
    query.limit,
    options.defaultLimit ?? 25,
    options.maxLimit ?? 100
  );
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  const search = parseSearch(query.search);
  const status = parseString(query.status);

  if (status) {
    filter.status = status;
  }

  if (search && options.searchFields?.length) {
    filter.$or = options.searchFields.map(field => ({
      [field]: { $regex: search, $options: 'i' },
    }));
  }

  const sort = normalizeSort(query.sort, options.sortFields, options.defaultSort ?? '-createdAt');

  return { page, limit, skip, filter, sort };
}
