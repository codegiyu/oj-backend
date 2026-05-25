import mongoose from 'mongoose';
import { User } from '../models/user';
import { Artist } from '../models/artist';
import { Vendor } from '../models/vendor';
import { AppError } from '../utils/AppError';
import { ACCOUNT_STATUSES, type AccountStatus } from '../lib/types/constants';
import { parseObjectId } from '../controllers/admin/admin.helpers';
import { parseNullableObjectId } from '../utils/parseNullableObjectId';

export function parseUserLinkId(
  value: string | null | undefined,
  field: 'artistId' | 'vendorId'
): mongoose.Types.ObjectId | null {
  return parseNullableObjectId(value, field);
}

export function assertPatchableAccountStatus(status: string): AccountStatus {
  if (status === 'deleted') {
    throw new AppError('Use the deletion approval flow to mark an account deleted', 400);
  }

  if (!(ACCOUNT_STATUSES as readonly string[]).includes(status)) {
    throw new AppError('Invalid accountStatus', 400);
  }

  return status as AccountStatus;
}

export async function linkUserArtist(
  userId: mongoose.Types.ObjectId,
  artistId: mongoose.Types.ObjectId | null
): Promise<void> {
  const user = await User.findById(userId).select('artistId').lean();
  if (!user) throw new AppError('User not found', 404);

  if (artistId == null) {
    await User.updateOne({ _id: userId }, { $set: { artistId: null } });
    await Artist.updateMany({ user: userId }, { $set: { user: null } });
    return;
  }

  const artist = await Artist.findById(artistId).select('user name').lean();
  if (!artist) throw new AppError('Artist not found', 404);

  const linkedUserId =
    artist.user != null ? parseObjectId(String(artist.user), 'artist.user') : null;
  if (linkedUserId && !linkedUserId.equals(userId)) {
    throw new AppError('Artist is already linked to another user', 409);
  }

  const previousArtistId = user.artistId;
  if (previousArtistId && !previousArtistId.equals(artistId)) {
    await Artist.updateOne({ _id: previousArtistId, user: userId }, { $set: { user: null } });
  }

  await Artist.updateOne({ _id: artistId }, { $set: { user: userId } });
  await User.updateOne({ _id: userId }, { $set: { artistId } });
}

export async function linkUserVendor(
  userId: mongoose.Types.ObjectId,
  vendorId: mongoose.Types.ObjectId | null
): Promise<void> {
  const user = await User.findById(userId).select('vendorId').lean();
  if (!user) throw new AppError('User not found', 404);

  if (vendorId == null) {
    await User.updateOne({ _id: userId }, { $set: { vendorId: null } });
    return;
  }

  const vendor = await Vendor.findById(vendorId).select('name storeName').lean();
  if (!vendor) throw new AppError('Vendor not found', 404);

  const existing = await User.findOne({
    vendorId,
    _id: { $ne: userId },
  })
    .select('_id')
    .lean();

  if (existing) {
    throw new AppError('Vendor is already linked to another user', 409);
  }

  await User.updateOne({ _id: userId }, { $set: { vendorId } });
}

export async function approveUserDeletionRequest(
  userId: mongoose.Types.ObjectId,
  adminId: mongoose.Types.ObjectId
): Promise<void> {
  const user = await User.findById(userId).select('deleteRequestedAt accountStatus').lean();

  if (!user) throw new AppError('User not found', 404);
  if (!user.deleteRequestedAt) {
    throw new AppError('User has not requested account deletion', 400);
  }

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        isDeleted: true,
        accountStatus: 'deleted',
        deletionApprovedAt: new Date(),
        deletionApprovedBy: adminId,
        deleteRequestedAt: null,
        'auth.refreshTokenJTI': '',
      },
    }
  );
}

export async function rejectUserDeletionRequest(userId: mongoose.Types.ObjectId): Promise<void> {
  const user = await User.findById(userId).select('deleteRequestedAt').lean();
  if (!user) throw new AppError('User not found', 404);
  if (!user.deleteRequestedAt) {
    throw new AppError('User has not requested account deletion', 400);
  }

  await User.updateOne({ _id: userId }, { $unset: { deleteRequestedAt: '' } });
}
