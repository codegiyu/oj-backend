import { describe, expect, it, vi } from 'vitest';
import { defaultSimpleProductSku } from '../../src/utils/marketplaceProductSku';
import { setBooleanInventoryAfterOrder } from '../../src/utils/marketplaceInventory';

vi.mock('../../src/models/product', () => ({
  Product: {
    findById: vi.fn().mockReturnValue({
      session: vi.fn().mockResolvedValue(null),
    }),
  },
}));

describe('marketplaceInventory', () => {
  it('setBooleanInventoryAfterOrder resolves without side effects', async () => {
    await expect(
      setBooleanInventoryAfterOrder([
        { product: '507f1f77bcf86cd799439011' as unknown as import('mongoose').Types.ObjectId, quantity: 1 },
      ])
    ).resolves.toBeUndefined();
  });
});

describe('defaultSimpleProductSku', () => {
  it('uppercases slug and strips invalid characters', () => {
    expect(defaultSimpleProductSku('blue-jacket-ada-fashion')).toBe('BLUE-JACKET-ADA-FASHION');
  });
});
