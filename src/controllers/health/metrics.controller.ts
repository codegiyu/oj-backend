import { FastifyReply, FastifyRequest } from 'fastify';
import {
  formatLatencyHistogramPrometheus,
  getLatencyHistogramSnapshot,
} from '../../observability/latencyHistogram';
import { sendResponse } from '../../utils/response';

export function metrics(request: FastifyRequest, reply: FastifyReply): void {
  const wantsPrometheus =
    request.headers.accept?.includes('text/plain') ||
    (request.query as { format?: string })?.format === 'prometheus';

  if (wantsPrometheus) {
    reply.header('content-type', 'text/plain; version=0.0.4');
    reply.send(formatLatencyHistogramPrometheus());
    return;
  }

  sendResponse(
    reply,
    200,
    getLatencyHistogramSnapshot() as unknown as Record<string, unknown>,
    'Latency snapshot'
  );
}
