import type { FastifyInstance } from 'fastify';
import { recordAuditFromRequest } from '../services/auditLog.service';

/** Logs successful admin DELETE / approve / reject mutations after response is sent. */
export function registerPrivilegedAuditHook(app: FastifyInstance): void {
  app.addHook('onResponse', async (request, reply) => {
    if (reply.statusCode < 200 || reply.statusCode >= 300) {
      return;
    }

    await recordAuditFromRequest(request, reply.statusCode);
  });
}
