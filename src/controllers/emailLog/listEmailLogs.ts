import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { EmailLog } from '../../models/emailLog';
import { getAuthUser } from '../../utils/getAuthUser';
import { EMAIL_STATUSES } from '../../lib/types/constants';
import type { EmailStatus } from '../../lib/types/constants';

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

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
}

export async function listEmailLogs(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      status?: string;
      type?: string;
      to?: string;
      startDate?: string;
      endDate?: string;
      sort?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'console-access') {
    throw new AppError('Access denied: only admins may list email logs', 403);
  }

  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const limit = parsePositiveInteger(request.query.limit, 25, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  const status = parseStatus(request.query.status);
  if (status) filter.status = status;
  if (typeof request.query.type === 'string') filter.type = request.query.type;
  if (typeof request.query.to === 'string') filter.to = { $regex: request.query.to, $options: 'i' };

  const startDate = parseDate(request.query.startDate);
  const endDate = parseDate(request.query.endDate);
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) (filter.createdAt as Record<string, Date>).$gte = startDate;
    if (endDate) (filter.createdAt as Record<string, Date>).$lte = endDate;
  }

  const sortField = typeof request.query.sort === 'string' ? request.query.sort : '-createdAt';

  const [emailLogs, total] = await Promise.all([
    EmailLog.find(filter).sort(sortField).skip(skip).limit(limit).lean(),
    EmailLog.countDocuments(filter),
  ]);

  sendResponse(reply, 200, {
    emailLogs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }, 'Email logs loaded.');
}
