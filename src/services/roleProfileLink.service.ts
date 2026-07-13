import mongoose, { type HydratedDocument } from 'mongoose';
import { User } from '../models/user';
import { Vendor } from '../models/vendor';
import { Artist } from '../models/artist';
import { Pastor } from '../models/pastor';
import type { ModelVendor } from '../lib/types/constants';
import { AppError } from '../utils/AppError';

/**
 * Ensure a vendor document is bidirectionally linked to a user account.
 * Prefers existing vendor.user; otherwise matches a user by email with empty vendorId.
 * Throws 409 when no linkable user exists (never silent no-op).
 */
export async function ensureVendorUserLink(
  vendor:
    | HydratedDocument<ModelVendor>
    | {
        _id: mongoose.Types.ObjectId;
        user?: mongoose.Types.ObjectId | null;
        email: string;
        save: () => Promise<unknown>;
      }
): Promise<void> {
  if (vendor.user) {
    await User.updateOne({ _id: vendor.user }, { $set: { vendorId: vendor._id } });
    return;
  }

  const email = typeof vendor.email === 'string' ? vendor.email.trim().toLowerCase() : '';

  if (!email) {
    throw new AppError(
      'Vendor has no email to match a user account. Link the store via Users admin or set the vendor email first.',
      409
    );
  }

  const matchingUser = await User.findOne({
    email,
    $or: [{ vendorId: null }, { vendorId: { $exists: false } }],
  }).select('_id');

  if (!matchingUser) {
    throw new AppError(
      'No matching user account found to link this vendor. Fix the vendor email to match the login email, or link via Users admin.',
      409
    );
  }

  vendor.user = matchingUser._id;
  await vendor.save();
  await User.updateOne({ _id: matchingUser._id }, { $set: { vendorId: vendor._id } });
}

/** If User.vendorId is unset but a Vendor has user === userId, set vendorId. */
export async function healVendorIdForUser(
  userId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId | null> {
  const vendor = await Vendor.findOne({ user: userId }).select('_id').lean();

  if (!vendor?._id) return null;

  const vendorId = vendor._id;
  await User.updateOne({ _id: userId, vendorId: null }, { $set: { vendorId } });

  return vendorId;
}

/** If User.artistId is unset but an Artist has user === userId, set artistId. */
export async function healArtistIdForUser(
  userId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId | null> {
  const artist = await Artist.findOne({ user: userId }).select('_id').lean();

  if (!artist?._id) return null;

  const artistId = artist._id;
  await User.updateOne({ _id: userId, artistId: null }, { $set: { artistId } });

  return artistId;
}

/** If User.pastorId is unset but a Pastor has user === userId, set pastorId. */
export async function healPastorIdForUser(
  userId: mongoose.Types.ObjectId
): Promise<mongoose.Types.ObjectId | null> {
  const pastor = await Pastor.findOne({ user: userId }).select('_id').lean();

  if (!pastor?._id) return null;

  const pastorId = pastor._id;
  await User.updateOne({ _id: userId, pastorId: null }, { $set: { pastorId } });

  return pastorId;
}

/** Clear User.artistId references when an artist profile is deleted. */
export async function clearUserArtistLinks(artistId: mongoose.Types.ObjectId): Promise<void> {
  await User.updateMany({ artistId }, { $set: { artistId: null } });
}

/** Clear User.pastorId references when a pastor profile is deleted. */
export async function clearUserPastorLinks(pastorId: mongoose.Types.ObjectId): Promise<void> {
  await User.updateMany({ pastorId }, { $set: { pastorId: null } });
}
