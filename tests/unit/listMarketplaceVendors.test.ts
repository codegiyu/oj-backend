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
    vi.spyOn(marketplaceRepo, 'countPublishedProductsForVendor').mockResolvedValue(0);

    await listMarketplaceVendors({ featured: 'true', limit: '10', page: '1' });

    expect(marketplaceRepo.listActiveVendors).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: expect.objectContaining({ status: 'active', isFeatured: true }),
        sort: expect.objectContaining({ updatedAt: -1 }),
      })
    );
  });
});
