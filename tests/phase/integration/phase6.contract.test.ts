import { describe, expect, it } from 'vitest';
import { resolvePrivilegedAdminAction } from '../../../src/utils/privilegedAudit';
import { successEnvelopeResponseSchema } from '../../../src/schemas/response.envelope';

describe('Phase 6 contract', () => {
  it('uses JSON Schema response envelopes on hot paths', () => {
    expect(successEnvelopeResponseSchema(200, { type: 'object' })).toMatchObject({
      200: { properties: { success: { enum: [true] } } },
    });
  });

  it('resolves admin delete audit descriptors', () => {
    const descriptor = resolvePrivilegedAdminAction({
      method: 'DELETE',
      routerPath: '/api/v1/admin/news/:id',
      params: { id: '507f1f77bcf86cd799439099' },
    });

    expect(descriptor?.action).toBe('admin.delete');
    expect(descriptor?.resourceType).toBe('news');
  });
});
