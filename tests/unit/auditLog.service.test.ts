import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/repositories/auditLog.repository', () => ({
  insertAuditLog: vi.fn(),
}));

import { insertAuditLog } from '@/repositories/auditLog.repository';
import { recordAuditEvent } from '@/services/auditLog.service';

describe('auditLog.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(insertAuditLog).mockResolvedValue({ _id: 'audit1' });
  });

  it('persists structured privileged audit events', async () => {
    await recordAuditEvent({
      action: 'auth.login',
      actorId: '507f1f77bcf86cd799439011',
      actorEmail: 'admin@example.com',
      actorScope: 'console-access',
      resourceType: 'admin',
      requestId: 'req-1',
      method: 'POST',
      path: '/api/v1/auth/login',
      statusCode: 200,
    });

    expect(insertAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.login',
        actorId: '507f1f77bcf86cd799439011',
        actorEmail: 'admin@example.com',
        actorScope: 'console-access',
        resourceType: 'admin',
        requestId: 'req-1',
        method: 'POST',
        path: '/api/v1/auth/login',
        statusCode: 200,
      })
    );
  });
});
