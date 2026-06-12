import { describe, expect, it } from 'vitest';
import { defaultSimpleProductSku } from '../../src/utils/marketplaceProductSku';
import { setBooleanInventoryAfterOrder } from '../../src/utils/marketplaceInventory';

describe('marketplaceInventory', () => {
  it('setBooleanInventoryAfterOrder resolves without side effects', async () => {
    await expect(
      setBooleanInventoryAfterOrder([
        { product: '507f1f77bcf86cd799439011' as unknown as import('mongoose').Types.ObjectId },
      ])
    ).resolves.toBeUndefined();
  });
});

describe('defaultSimpleProductSku', () => {
  it('uppercases slug and strips invalid characters', () => {
    expect(defaultSimpleProductSku('blue-jacket-ada-fashion')).toBe('BLUE-JACKET-ADA-FASHION');
  });
});
