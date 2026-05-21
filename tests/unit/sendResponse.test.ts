import type { FastifyReply } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { sendResponse, sendErrorResponse } from '../../src/utils/response';

describe('sendResponse envelope', () => {
  it('sends the standard success shape', () => {
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const reply = { status } as Pick<FastifyReply, 'status'>;

    sendResponse(reply as FastifyReply, 200, { items: [] }, 'OK');

    expect(status).toHaveBeenCalledWith(200);
    expect(send).toHaveBeenCalledWith({
      success: true,
      data: { items: [] },
      responseCode: 200,
      message: 'OK',
    });
  });

  it('sends the standard error shape', () => {
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const reply = { status } as Pick<FastifyReply, 'status'>;

    sendErrorResponse(reply as FastifyReply, 400, 'Bad request', { details: [] });

    expect(send).toHaveBeenCalledWith({
      success: false,
      data: { details: [] },
      responseCode: 400,
      message: 'Bad request',
    });
  });
});
