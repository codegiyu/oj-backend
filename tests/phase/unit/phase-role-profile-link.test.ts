import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { AppError } from '../../../src/utils/AppError';

const vendorId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439021');
const userId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439022');
const artistId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439023');

const {
  userUpdateOneMock,
  userFindOneMock,
  vendorFindOneMock,
  artistFindOneMock,
  pastorFindOneMock,
} = vi.hoisted(() => ({
  userUpdateOneMock: vi.fn(),
  userFindOneMock: vi.fn(),
  vendorFindOneMock: vi.fn(),
  artistFindOneMock: vi.fn(),
  pastorFindOneMock: vi.fn(),
}));

vi.mock('../../../src/models/user', () => ({
  User: {
    updateOne: userUpdateOneMock,
    findOne: userFindOneMock,
  },
}));

vi.mock('../../../src/models/vendor', () => ({
  Vendor: {
    findOne: vendorFindOneMock,
  },
}));

vi.mock('../../../src/models/artist', () => ({
  Artist: {
    findOne: artistFindOneMock,
  },
}));

vi.mock('../../../src/models/pastor', () => ({
  Pastor: {
    findOne: pastorFindOneMock,
  },
}));

import {
  ensureVendorUserLink,
  healArtistIdForUser,
  healPastorIdForUser,
  healVendorIdForUser,
} from '../../../src/services/roleProfileLink.service';

describe('phase role-profile link integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userUpdateOneMock.mockResolvedValue({ acknowledged: true });
  });

  describe('ensureVendorUserLink', () => {
    it('links User.vendorId when vendor.user is already set', async () => {
      const vendor = {
        _id: vendorId,
        user: userId,
        email: 'shop@example.com',
        save: vi.fn(),
      };

      await ensureVendorUserLink(vendor as never);

      expect(userUpdateOneMock).toHaveBeenCalledWith(
        { _id: userId },
        { $set: { vendorId: vendorId } }
      );
      expect(vendor.save).not.toHaveBeenCalled();
    });

    it('links by email when vendor.user is unset and a free matching user exists', async () => {
      const vendor = {
        _id: vendorId,
        user: null,
        email: 'Shop@Example.com',
        save: vi.fn().mockResolvedValue(undefined),
      };

      userFindOneMock.mockReturnValue({
        select: vi.fn().mockResolvedValue({ _id: userId }),
      });

      await ensureVendorUserLink(vendor as never);

      expect(userFindOneMock).toHaveBeenCalled();
      expect(vendor.user).toEqual(userId);
      expect(vendor.save).toHaveBeenCalled();
      expect(userUpdateOneMock).toHaveBeenCalledWith(
        { _id: userId },
        { $set: { vendorId: vendorId } }
      );
    });

    it('throws 409 when no linkable user exists', async () => {
      const vendor = {
        _id: vendorId,
        user: null,
        email: 'orphan@example.com',
        save: vi.fn(),
      };

      userFindOneMock.mockReturnValue({
        select: vi.fn().mockResolvedValue(null),
      });

      await expect(ensureVendorUserLink(vendor as never)).rejects.toBeInstanceOf(AppError);
      await expect(ensureVendorUserLink(vendor as never)).rejects.toMatchObject({
        statusCode: 409,
      });
    });
  });

  describe('heal*IdForUser', () => {
    it('heals vendorId from Vendor.user when User.vendorId is unset', async () => {
      vendorFindOneMock.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: vendorId }),
        }),
      });

      const healed = await healVendorIdForUser(userId);

      expect(healed?.equals(vendorId)).toBe(true);
      expect(userUpdateOneMock).toHaveBeenCalledWith(
        { _id: userId, vendorId: null },
        { $set: { vendorId } }
      );
    });

    it('returns null when no vendor owns the user', async () => {
      vendorFindOneMock.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      });

      expect(await healVendorIdForUser(userId)).toBeNull();
      expect(userUpdateOneMock).not.toHaveBeenCalled();
    });

    it('heals artistId from Artist.user when unset', async () => {
      artistFindOneMock.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: artistId }),
        }),
      });

      const healed = await healArtistIdForUser(userId);

      expect(healed?.equals(artistId)).toBe(true);
      expect(userUpdateOneMock).toHaveBeenCalledWith(
        { _id: userId, artistId: null },
        { $set: { artistId } }
      );
    });

    it('heals pastorId from Pastor.user when unset', async () => {
      const pastorId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439024');
      pastorFindOneMock.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ _id: pastorId }),
        }),
      });

      const healed = await healPastorIdForUser(userId);

      expect(healed?.equals(pastorId)).toBe(true);
      expect(userUpdateOneMock).toHaveBeenCalledWith(
        { _id: userId, pastorId: null },
        { $set: { pastorId } }
      );
    });
  });
});
