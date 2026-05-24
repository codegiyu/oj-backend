import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';

type ListEmailLogsQuerystring = {
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

type ListEmailLogsRequest = FastifyRequest<{ Querystring: ListEmailLogsQuerystring }>;

const findMock = vi.fn((_: Record<string, unknown>) => Promise.resolve([] as unknown[]));
const countMock = vi.fn((_: Record<string, unknown>) => Promise.resolve(0));

vi.mock('../../src/models/emailLog', () => ({
  EmailLog: {
    find: (filter: Record<string, unknown>) => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: () => findMock(filter),
          }),
        }),
      }),
    }),
    countDocuments: (filter: Record<string, unknown>) => countMock(filter),
  },
}));

vi.mock('../../src/utils/response', () => ({
  sendResponse: vi.fn(),
}));

import { listEmailLogs } from '../../src/controllers/emailLog/listEmailLogs';
import { sendResponse } from '../../src/utils/response';

function mockRequest(query: ListEmailLogsQuerystring): ListEmailLogsRequest {
  return { query } as unknown as ListEmailLogsRequest;
}

function firstFindFilter(): Record<string, unknown> | undefined {
  const call = findMock.mock.calls[0];
  return call?.[0] as Record<string, unknown> | undefined;
}

describe('listEmailLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);
  });

  it('applies search across to, from, and subject', async () => {
    const request = mockRequest({ search: 'invoice', page: '1', limit: '25' });
    const reply = {} as unknown as FastifyReply;

    await listEmailLogs(request, reply);

    const filter = firstFindFilter();
    expect(filter?.$or).toEqual([
      { to: { $regex: 'invoice', $options: 'i' } },
      { from: { $regex: 'invoice', $options: 'i' } },
      { subject: { $regex: 'invoice', $options: 'i' } },
    ]);
    expect(sendResponse).toHaveBeenCalled();
  });

  it('applies status from tab query via status param', async () => {
    const request = mockRequest({ status: 'failed', page: '1', limit: '25' });
    const reply = {} as unknown as FastifyReply;

    await listEmailLogs(request, reply);

    const filter = firstFindFilter();
    expect(filter?.status).toBe('failed');
  });
});
