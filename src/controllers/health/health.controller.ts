import type { FastifyReply, FastifyRequest } from 'fastify';
import { getReadinessChecks } from '../../services/readiness.service';

// eslint-disable-next-line @typescript-eslint/require-await
export async function health(): Promise<{
  status: string;
  timestamp: string;
  uptime: number;
}> {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}

export async function ready(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const checks = await getReadinessChecks();
  const timestamp = new Date().toISOString();
  const allReady = checks.mongodb && checks.redis;

  if (!allReady) {
    await reply.status(503).send({
      status: 'not_ready',
      timestamp,
      checks,
    });

    return;
  }

  await reply.status(200).send({
    status: 'ready',
    timestamp,
    checks,
  });
}
