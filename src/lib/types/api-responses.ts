/**
 * Standard shape for paginated list API responses (Dashboard API and elsewhere).
 * All list endpoints that support pagination should return this format.
 */
export type GetListRes<T, Name extends string> = {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} & Record<Name, T[]>;
