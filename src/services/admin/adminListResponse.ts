/** Shared paginated list payload for admin content list services. */
export function buildAdminListPayload(
  collectionKey: string,
  page: number,
  limit: number,
  total: number,
  rows: Record<string, unknown>[]
): Record<string, unknown> {
  return {
    [collectionKey]: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export function adminListServiceResult(
  collectionKey: string,
  message: string,
  page: number,
  limit: number,
  total: number,
  rows: Record<string, unknown>[]
): { statusCode: number; data: Record<string, unknown>; message: string } {
  return {
    statusCode: 200,
    data: buildAdminListPayload(collectionKey, page, limit, total, rows),
    message,
  };
}
