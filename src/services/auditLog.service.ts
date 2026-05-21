import type { FastifyRequest } from 'fastify';
import { insertAuditLog } from '../repositories/auditLog.repository';
import { logger } from '../utils/logger';
import { getAuthUser } from '../utils/getAuthUser';
import { resolvePrivilegedAdminAction } from '../utils/privilegedAudit';

export type AuditEventInput = {
  action: string;
  resourceType: string;
  resourceId?: string;
  actorId?: string;
  actorEmail?: string;
  actorScope?: string;
  requestId?: string;
  method: string;
  path: string;
  statusCode: number;
  metadata?: Record<string, unknown>;
};

export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await insertAuditLog({
      action: input.action,
      actorId: input.actorId ?? '',
      actorEmail: input.actorEmail ?? '',
      actorScope: input.actorScope ?? '',
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? '',
      requestId: input.requestId ?? '',
      method: input.method,
      path: input.path,
      statusCode: input.statusCode,
      metadata: input.metadata,
    });
  } catch (error) {
    logger.error('Failed to persist audit log', {
      action: input.action,
      path: input.path,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function recordAuditFromRequest(
  request: FastifyRequest,
  statusCode: number,
  override?: Partial<AuditEventInput>
): Promise<void> {
  const auth = getAuthUser(request);
  const routerPath = request.routeOptions?.url ?? request.url;
  const params = (request.params ?? {}) as Record<string, string | undefined>;
  const descriptor = resolvePrivilegedAdminAction({
    method: request.method,
    routerPath,
    params,
  });

  if (!descriptor && !override?.action) {
    return;
  }

  await recordAuditEvent({
    action: override?.action ?? descriptor!.action,
    resourceType: override?.resourceType ?? descriptor!.resourceType,
    resourceId: override?.resourceId ?? descriptor?.resourceId,
    actorId: override?.actorId ?? auth?.userId,
    actorEmail: override?.actorEmail ?? auth?.email,
    actorScope: override?.actorScope ?? auth?.scope,
    requestId: override?.requestId ?? String(request.id),
    method: override?.method ?? request.method,
    path: override?.path ?? request.url,
    statusCode: override?.statusCode ?? statusCode,
    metadata: override?.metadata,
  });
}
