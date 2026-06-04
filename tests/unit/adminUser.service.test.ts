import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

const userId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
const vendorId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439012');
const pastorId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439013');
const otherUserId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439014');

const {
  userFindByIdMock,
  userUpdateOneMock,
  userFindOneMock,
  vendorFindByIdMock,
  vendorUpdateOneMock,
  vendorUpdateManyMock,
  pastorFindByIdMock,
  pastorUpdateOneMock,
  pastorUpdateManyMock,
} = vi.hoisted(() => ({
  userFindByIdMock: vi.fn(),
  userUpdateOneMock: vi.fn(),
  userFindOneMock: vi.fn(),
  vendorFindByIdMock: vi.fn(),
  vendorUpdateOneMock: vi.fn(),
  vendorUpdateManyMock: vi.fn(),
  pastorFindByIdMock: vi.fn(),
  pastorUpdateOneMock: vi.fn(),
  pastorUpdateManyMock: vi.fn(),
}));

vi.mock('../../src/models/user', () => ({
  User: {
    findById: userFindByIdMock,
    updateOne: userUpdateOneMock,
    findOne: userFindOneMock,
  },
}));

vi.mock('../../src/models/vendor', () => ({
  Vendor: {
    findById: vendorFindByIdMock,
    updateOne: vendorUpdateOneMock,
    updateMany: vendorUpdateManyMock,
  },
}));

vi.mock('../../src/models/pastor', () => ({
  Pastor: {
    findById: pastorFindByIdMock,
    updateOne: pastorUpdateOneMock,
    updateMany: pastorUpdateManyMock,
  },
}));

import { linkUserPastor, linkUserVendor } from '../../src/services/adminUser.service';
import { parseNullableObjectId } from '../../src/utils/parseNullableObjectId';

describe('parseNullableObjectId', () => {
  it('accepts valid ids and null to clear links', () => {
    expect(parseNullableObjectId(null, 'artistId')).toBeNull();
    expect(parseNullableObjectId('507f1f77bcf86cd799439011', 'artistId')).toBeTruthy();
  });

  it('rejects invalid ids', () => {
    expect(() => parseNullableObjectId('not-an-id', 'artistId')).toThrow(/Invalid artistId/i);
  });
});

describe('linkUserVendor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userUpdateOneMock.mockResolvedValue({ acknowledged: true });
    vendorUpdateOneMock.mockResolvedValue({ acknowledged: true });
    vendorUpdateManyMock.mockResolvedValue({ acknowledged: true });
  });

  it('clears vendorId and vendor.user on unlink', async () => {
    userFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ vendorId }),
      }),
    });

    await linkUserVendor(userId, null);

    expect(userUpdateOneMock).toHaveBeenCalledWith(
      { _id: userId },
      { $set: { vendorId: null } }
    );
    expect(vendorUpdateManyMock).toHaveBeenCalledWith(
      { user: userId },
      { $set: { user: null } }
    );
  });

  it('sets vendor.user and user.vendorId on link', async () => {
    userFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ vendorId: null }),
      }),
    });

    vendorFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ user: null, name: 'Store', storeName: 'Ada Store' }),
      }),
    });

    await linkUserVendor(userId, vendorId);

    expect(vendorUpdateOneMock).toHaveBeenCalledWith(
      { _id: vendorId },
      { $set: { user: userId } }
    );
    expect(userUpdateOneMock).toHaveBeenCalledWith(
      { _id: userId },
      { $set: { vendorId } }
    );
  });

  it('rejects when vendor is linked to another user', async () => {
    userFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ vendorId: null }),
      }),
    });

    vendorFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ user: otherUserId }),
      }),
    });

    await expect(linkUserVendor(userId, vendorId)).rejects.toThrow(
      /already linked to another user/i
    );
  });
});

describe('linkUserPastor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userUpdateOneMock.mockResolvedValue({ acknowledged: true });
    pastorUpdateOneMock.mockResolvedValue({ acknowledged: true });
    pastorUpdateManyMock.mockResolvedValue({ acknowledged: true });
  });

  it('clears pastorId and pastor.user on unlink', async () => {
    userFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ pastorId }),
      }),
    });

    await linkUserPastor(userId, null);

    expect(userUpdateOneMock).toHaveBeenCalledWith(
      { _id: userId },
      { $set: { pastorId: null } }
    );
    expect(pastorUpdateManyMock).toHaveBeenCalledWith(
      { user: userId },
      { $set: { user: null } }
    );
  });

  it('sets pastor.user and user.pastorId on link', async () => {
    userFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ pastorId: null }),
      }),
    });

    pastorFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ user: null, name: 'Rev. Ada' }),
      }),
    });

    await linkUserPastor(userId, pastorId);

    expect(pastorUpdateOneMock).toHaveBeenCalledWith(
      { _id: pastorId },
      { $set: { user: userId } }
    );
    expect(userUpdateOneMock).toHaveBeenCalledWith(
      { _id: userId },
      { $set: { pastorId } }
    );
  });
});
