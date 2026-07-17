import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { vendorId, approvedBy, mockVendorDoc } = vi.hoisted(() => {
  const vendorId = new mongoose.Types.ObjectId();
  const approvedBy = new mongoose.Types.ObjectId();

  const mockVendorDoc = {
    _id: vendorId,
    toObject: () => ({
      _id: vendorId,
      storeName: 'Grace Store',
      slug: 'grace-store',
      status: 'active',
      approvedBy,
      approvedAt: new Date('2026-03-01T12:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    }),
  };

  return { vendorId, approvedBy, mockVendorDoc };
});

vi.mock('../../src/repositories/vendor/vendor.repository', () => ({
  findUserVendorFields: vi.fn().mockResolvedValue({ vendorId }),
  findVendorDocumentById: vi.fn().mockResolvedValue(mockVendorDoc),
  countProductsForVendor: vi.fn().mockResolvedValue(3),
}));

vi.mock('../../src/services/roleProfileLink.service', () => ({
  healVendorIdForUser: vi.fn(),
}));

vi.mock('../../src/services/roleProfileLifecycle.service', () => ({
  loadAppealSummariesForProfile: vi.fn().mockResolvedValue({
    pending: null,
    lastRejected: null,
  }),
  shapeRolePortalMeta: vi.fn(() => ({
    portalStatus: 'active',
    statusChangedAt: '2026-01-01T00:00:00.000Z',
    suspensionReason: '',
    openAppeal: null,
    lastRejectedAppeal: null,
  })),
}));

import { loadVendorMe } from '../../src/services/vendor.service';

describe('loadVendorMe serialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stringifies vendor document ids and dates in the returned payload', async () => {
    const userId = String(new mongoose.Types.ObjectId());
    const result = await loadVendorMe(userId);

    expect(typeof result._id).toBe('string');
    expect(result._id).toBe(String(vendorId));
    expect(result.approvedBy).toBe(String(approvedBy));
    expect(result.approvedAt).toBe('2026-03-01T12:00:00.000Z');
    expect(result.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(result.productCount).toBe(3);
    expect(result.portalStatus).toBe('active');
  });
});
