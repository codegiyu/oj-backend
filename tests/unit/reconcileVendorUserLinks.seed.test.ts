import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

const userId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
const vendorId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439012');
const otherUserId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439014');

const {
  userFindMock,
  userFindByIdMock,
  userUpdateOneMock,
  vendorFindByIdMock,
  vendorUpdateOneMock,
  vendorFindMock,
  deploymentFindOneMock,
  deploymentCreateMock,
  deploymentFindByIdAndUpdateMock,
} = vi.hoisted(() => ({
  userFindMock: vi.fn(),
  userFindByIdMock: vi.fn(),
  userUpdateOneMock: vi.fn(),
  vendorFindByIdMock: vi.fn(),
  vendorUpdateOneMock: vi.fn(),
  vendorFindMock: vi.fn(),
  deploymentFindOneMock: vi.fn(),
  deploymentCreateMock: vi.fn(),
  deploymentFindByIdAndUpdateMock: vi.fn(),
}));

vi.mock('../../src/models/user', () => ({
  User: {
    find: userFindMock,
    findById: userFindByIdMock,
    updateOne: userUpdateOneMock,
  },
}));

vi.mock('../../src/models/vendor', () => ({
  Vendor: {
    find: vendorFindMock,
    findById: vendorFindByIdMock,
    updateOne: vendorUpdateOneMock,
  },
}));

vi.mock('../../src/models/deploymentMigration', () => ({
  DeploymentMigration: {
    findOne: deploymentFindOneMock,
    create: deploymentCreateMock,
    findByIdAndUpdate: deploymentFindByIdAndUpdateMock,
  },
}));

import { reconcileVendorUserLinksOnce } from '../../src/seed/reconcileVendorUserLinks';

function mockCursor<T>(items: T[]) {
  async function* iterate() {
    for (const item of items) {
      yield item;
    }
  }

  return {
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockReturnValue({
        cursor: vi.fn().mockReturnValue(iterate()),
      }),
    }),
  };
}

describe('reconcileVendorUserLinksOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deploymentFindOneMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });
    deploymentCreateMock.mockResolvedValue({ _id: 'migration-1' });
    deploymentFindByIdAndUpdateMock.mockResolvedValue(null);
    userUpdateOneMock.mockResolvedValue({ acknowledged: true });
    vendorUpdateOneMock.mockResolvedValue({ acknowledged: true });
  });

  it('skips when migration already completed', async () => {
    deploymentFindOneMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'done', status: 'completed' }),
    });

    await reconcileVendorUserLinksOnce();

    expect(userFindMock).not.toHaveBeenCalled();
    expect(deploymentCreateMock).not.toHaveBeenCalled();
  });

  it('sets vendor.user from user.vendorId when missing', async () => {
    userFindMock.mockReturnValue(
      mockCursor([{ _id: userId, vendorId }])
    );
    vendorFindMock.mockReturnValue(mockCursor([]));

    vendorFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ user: null }),
      }),
    });

    await reconcileVendorUserLinksOnce();

    expect(vendorUpdateOneMock).toHaveBeenCalledWith(
      { _id: vendorId },
      { $set: { user: userId } }
    );
  });

  it('does not overwrite vendor.user when it points at another user', async () => {
    userFindMock.mockReturnValue(
      mockCursor([{ _id: userId, vendorId }])
    );
    vendorFindMock.mockReturnValue(mockCursor([]));

    vendorFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ user: otherUserId }),
      }),
    });

    await reconcileVendorUserLinksOnce();

    expect(vendorUpdateOneMock).not.toHaveBeenCalled();
  });

  it('sets user.vendorId from vendor.user when user has no vendorId', async () => {
    userFindMock.mockReturnValue(mockCursor([]));
    vendorFindMock.mockReturnValue(mockCursor([{ _id: vendorId, user: userId }]));

    userFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ vendorId: null }),
      }),
    });

    await reconcileVendorUserLinksOnce();

    expect(userUpdateOneMock).toHaveBeenCalledWith(
      { _id: userId, vendorId: null },
      { $set: { vendorId } }
    );
  });
});
