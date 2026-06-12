/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  productUpdateManyMock,
  productFindMock,
  productCountDocumentsMock,
  deploymentFindOneMock,
  deploymentCreateMock,
  deploymentFindByIdAndUpdateMock,
} = vi.hoisted(() => ({
  productUpdateManyMock: vi.fn(),
  productFindMock: vi.fn(),
  productCountDocumentsMock: vi.fn(),
  deploymentFindOneMock: vi.fn(),
  deploymentCreateMock: vi.fn(),
  deploymentFindByIdAndUpdateMock: vi.fn(),
}));

vi.mock('../../src/models/product', () => ({
  Product: {
    updateMany: productUpdateManyMock,
    find: productFindMock,
    countDocuments: productCountDocumentsMock,
  },
}));

vi.mock('../../src/models/deploymentMigration', () => ({
  DeploymentMigration: {
    findOne: deploymentFindOneMock,
    create: deploymentCreateMock,
    findByIdAndUpdate: deploymentFindByIdAndUpdateMock,
  },
}));

import { backfillProductUnlimitedInventoryOnce } from '../../src/seed/backfillProductUnlimitedInventoryOnce';

describe('backfillProductUnlimitedInventoryOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deploymentFindOneMock.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    deploymentCreateMock.mockResolvedValue({ _id: 'migration-id' });
    deploymentFindByIdAndUpdateMock.mockResolvedValue({});
    productUpdateManyMock.mockResolvedValue({ modifiedCount: 5 });
    productCountDocumentsMock.mockResolvedValue(10);
    productFindMock.mockReturnValue({
      cursor: vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          // no simple products without sku
        },
      }),
    });
  });

  it('skips when migration already completed', async () => {
    deploymentFindOneMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ status: 'completed' }),
    });

    await backfillProductUnlimitedInventoryOnce();

    expect(productUpdateManyMock).not.toHaveBeenCalled();
  });

  it('sets unlimited inventory and restores stock flags', async () => {
    await backfillProductUnlimitedInventoryOnce();

    expect(productUpdateManyMock).toHaveBeenCalledTimes(2);
    expect(productUpdateManyMock).toHaveBeenCalledWith(
      { 'variants.0': { $exists: true } },
      expect.objectContaining({
        $set: expect.objectContaining({
          inventoryMode: 'unlimited',
          inStock: true,
        }),
      })
    );
    expect(deploymentFindByIdAndUpdateMock).toHaveBeenCalledWith(
      'migration-id',
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'completed',
        }),
      })
    );
  });
});
