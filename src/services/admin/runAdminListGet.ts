import type { FastifyRequest } from 'fastify';
import { AppError } from '../../utils/AppError';
import { parseObjectId } from '../../controllers/admin/admin.helpers';
import { parseAdminListQuery } from './adminListQuery';
import { buildAdminListPayload } from './adminListResponse';

export type AdminListGetResult = {
  statusCode: number;
  data: unknown;
  message: string;
};

type AdminListQuerystring = {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  sort?: string;
  [key: string]: string | undefined;
};

export async function runAdminList<Q extends AdminListQuerystring, TRow>(
  request: FastifyRequest<{ Querystring: Q }>,
  config: {
    sortFields: string[];
    searchFields?: string[];
    defaultSort?: string;
    extendFilter?: (filter: Record<string, unknown>, query: Q) => void;
    listRows: (options: {
      filter: Record<string, unknown>;
      sort: string;
      skip: number;
      limit: number;
    }) => Promise<{ items: TRow[]; total: number }>;
    shapeItem: (raw: Record<string, unknown>) => Record<string, unknown>;
    collectionKey: string;
    message: string;
  }
): Promise<AdminListGetResult> {
  const { page, limit, skip, filter, sort } = parseAdminListQuery(
    request.query as AdminListQuerystring,
    {
      sortFields: config.sortFields,
      searchFields: config.searchFields,
      defaultSort: config.defaultSort,
    }
  );

  config.extendFilter?.(filter, request.query as Q);

  const { items, total } = await config.listRows({ filter, sort, skip, limit });
  const rows = items.map(item => config.shapeItem(item as unknown as Record<string, unknown>));

  return {
    statusCode: 200,
    data: buildAdminListPayload(config.collectionKey, page, limit, total, rows),
    message: config.message,
  };
}

export async function runAdminGet<TRow>(
  request: FastifyRequest<{ Params: { id: string } }>,
  config: {
    findById: (id: string) => Promise<TRow | null>;
    shapeItem: (raw: Record<string, unknown>) => Record<string, unknown>;
    itemKey: string;
    message: string;
    notFoundMessage: string;
  }
): Promise<AdminListGetResult> {
  const id = parseObjectId(request.params.id);
  const doc = await config.findById(String(id));

  if (!doc) {
    throw new AppError(config.notFoundMessage, 404);
  }

  return {
    statusCode: 200,
    data: { [config.itemKey]: config.shapeItem(doc as unknown as Record<string, unknown>) },
    message: config.message,
  };
}
