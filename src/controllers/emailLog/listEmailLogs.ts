import { FastifyRequest, FastifyReply } from 'fastify';
import { sendResponse } from '../../utils/response';
import { EmailLog } from '../../models/emailLog';
import { EMAIL_STATUSES } from '../../lib/types/constants';
import type { EmailStatus } from '../../lib/types/constants';
import { parseSearch, parseString } from '../../utils/helpers';
import { applyDateRangeFilter } from '../../services/admin/adminListFilters';

function parsePositiveInteger(value: unknown, fallback: number, maxVal: number): number {
  if (typeof value !== 'string') return fallback;
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maxVal);
}

function parseStatus(value: unknown): EmailStatus | undefined {
  if (typeof value !== 'string') return undefined;
  return EMAIL_STATUSES.includes(value as EmailStatus) ? (value as EmailStatus) : undefined;
}

export async function listEmailLogs(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      status?: string;
      type?: string;
      search?: string;
      to?: string;
      startDate?: string;
      endDate?: string;
      sort?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const limit = parsePositiveInteger(request.query.limit, 25, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  const status = parseStatus(request.query.status);
  if (status) filter.status = status;

  const type = parseString(request.query.type);
  if (type) filter.type = type;

  const search = parseSearch(request.query.search);
  if (search) {
    filter.$or = [
      { to: { $regex: search, $options: 'i' } },
      { from: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
    ];
  } else if (typeof request.query.to === 'string' && request.query.to.trim()) {
    filter.to = { $regex: request.query.to.trim(), $options: 'i' };
  }

  applyDateRangeFilter(filter, request.query.startDate, request.query.endDate);

  const sortField = typeof request.query.sort === 'string' ? request.query.sort : '-createdAt';

  const [emailLogs, total] = await Promise.all([
    EmailLog.find(filter).sort(sortField).skip(skip).limit(limit).lean(),
    EmailLog.countDocuments(filter),
  ]);

  sendResponse(
    reply,
    200,
    {
      emailLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
    'Email logs loaded.'
  );
}
