import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as marketplaceRepo from '../../src/repositories/marketplace/marketplace.repository';
import { listMarketplaceVendors } from '../../src/services/marketplace.service';

describe('listMarketplaceVendors', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('applies isFeatured filter when featured=true', async () => {
    vi.spyOn(marketplaceRepo, 'listActiveVendors').mockResolvedValue([]);
    vi.spyOn(marketplaceRepo, 'countVendors').mockResolvedValue(0);
    vi.spyOn(marketplaceRepo, 'countPublishedProductsByVendorIds').mockResolvedValue(new Map());

    await listMarketplaceVendors({ featured: 'true', limit: '10', page: '1' });

    expect(marketplaceRepo.listActiveVendors).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({ status: 'active', isFeatured: true }),
        sort: expect.objectContaining({ updatedAt: -1 }),
      })
    );
  });

  it('uses batch product count aggregation instead of per-vendor counts', async () => {
    const vendorId = '507f1f77bcf86cd799439011' as unknown as import('mongoose').Types.ObjectId;

    vi.spyOn(marketplaceRepo, 'listActiveVendors').mockResolvedValue([
      { _id: vendorId, storeName: 'Shop A', name: 'Shop A', slug: 'shop-a', status: 'active' },
    ] as never);
    vi.spyOn(marketplaceRepo, 'countVendors').mockResolvedValue(1);
    const batchSpy = vi
      .spyOn(marketplaceRepo, 'countPublishedProductsByVendorIds')
      .mockResolvedValue(new Map([[String(vendorId), 3]]));
    const perVendorSpy = vi.spyOn(marketplaceRepo, 'countPublishedProductsForVendor');

    const result = await listMarketplaceVendors({ limit: '10', page: '1' });

    expect(batchSpy).toHaveBeenCalledWith([vendorId]);
    expect(perVendorSpy).not.toHaveBeenCalled();
    expect(result.vendors[0]?.productCount).toBe(3);
  });
});
