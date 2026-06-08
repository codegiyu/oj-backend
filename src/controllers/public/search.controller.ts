/**
 * Unified public search across music, videos, news, devotionals, testimonies,
 * prayer requests, questions, polls, artists, resources.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { sendResponse } from '../../utils/response';
import {
  runPublicSearch,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
} from '../../services/publicSearch.service';

interface SearchQuerystring {
  q?: string;
  type?: string;
  page?: string;
  limit?: string;
}

export async function search(
  request: FastifyRequest<{ Querystring: SearchQuerystring }>,
  reply: FastifyReply
): Promise<void> {
  const q = (request.query.q ?? '').trim();
  const typeFilter = request.query.type;
  const page = Math.max(1, parseInt(request.query.page ?? '1', 10) || 1);
  const limit = Math.min(
    SEARCH_MAX_LIMIT,
    Math.max(
      1,
      parseInt(request.query.limit ?? String(SEARCH_DEFAULT_LIMIT), 10) || SEARCH_DEFAULT_LIMIT
    )
  );

  const payload = await runPublicSearch({ q, typeFilter, page, limit });

  sendResponse(reply, 200, payload, 'Search results.');
}
