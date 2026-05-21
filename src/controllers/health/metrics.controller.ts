import { FastifyReply, FastifyRequest } from 'fastify';
import { getLatencyHistogramSnapshot } from '../../observability/latencyHistogram';
import { sendResponse } from '../../utils/response';

// eslint-disable-next-line @typescript-eslint/require-await
export async function metrics(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  sendResponse(
    reply,
    200,
    getLatencyHistogramSnapshot() as unknown as Record<string, unknown>,
    'Latency snapshot'
  );
}
