import mongoose from 'mongoose';
import { User } from '../models/user';
import { Artist } from '../models/artist';
import { AppError } from '../utils/AppError';
import { generateUniqueSlug } from '../utils/helpers';

function parseUserId(id: string, field = 'ownerUserId'): mongoose.Types.ObjectId {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${field}`, 400);
  }
  return new mongoose.Types.ObjectId(id);
}

/**
 * Resolves the Artist id for admin-created content.
 * `ownerUserId` takes precedence over `artistId` when both are provided.
 */
export async function resolveArtistIdForAdminContent(input: {
  ownerUserId?: string;
  artistId?: string;
}): Promise<mongoose.Types.ObjectId | undefined> {
  if (input.ownerUserId) {
    const uid = parseUserId(input.ownerUserId);
    const user = await User.findById(uid).select('artistId firstName lastName email').lean();
    if (!user) throw new AppError('User not found', 404);

    if (user.artistId) {
      const existing = await Artist.findById(user.artistId).lean();
      if (!existing) throw new AppError('Linked artist profile not found', 404);
      return user.artistId;
    }

    // Prefer an artist that already claims this user over creating a duplicate.
    const existingByUser = await Artist.findOne({ user: uid }).select('_id').lean();
    if (existingByUser?._id) {
      await User.updateOne(
        { _id: uid, artistId: null },
        { $set: { artistId: existingByUser._id } }
      );
      return existingByUser._id;
    }

    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      (typeof user.email === 'string' ? user.email.split('@')[0] : '') ||
      'Artist';
    const slug = await generateUniqueSlug(Artist, `${name}-${uid.toString().slice(-6)}`, {});

    const artist = await Artist.create({
      name,
      slug,
      user: uid,
      bio: '',
      image: '',
      coverImage: '',
      genre: '',
      socials: {},
      isFeatured: false,
      isActive: true,
      displayOrder: 0,
    });

    await User.updateOne({ _id: uid }, { $set: { artistId: artist._id } });

    return artist._id;
  }

  if (input.artistId) {
    if (!mongoose.Types.ObjectId.isValid(input.artistId)) {
      throw new AppError('Invalid artistId', 400);
    }
    const aid = new mongoose.Types.ObjectId(input.artistId);
    const art = await Artist.findById(aid).lean();
    if (!art) throw new AppError('Artist not found', 404);
    return aid;
  }

  return undefined;
}

type DocWithArtist = { artist?: mongoose.Types.ObjectId | null };

/** Apply one-time owner linking on PATCH. Returns new artist id when set, undefined if no payload. */
export async function applyContentOwnershipUpdate(
  doc: DocWithArtist,
  body: { ownerUserId?: string; artistId?: string },
  entityLabel: string
): Promise<mongoose.Types.ObjectId | undefined> {
  const hasOwner =
    (body.ownerUserId != null && String(body.ownerUserId).trim() !== '') ||
    (body.artistId != null && String(body.artistId).trim() !== '');
  if (!hasOwner) return undefined;

  if (doc.artist != null) {
    throw new AppError(`${entityLabel} owner is already set and cannot be changed`, 409);
  }

  const resolved = await resolveArtistIdForAdminContent({
    ownerUserId: body.ownerUserId?.trim() || undefined,
    artistId: body.artistId?.trim() || undefined,
  });
  if (!resolved) {
    throw new AppError('ownerUserId or artistId is required to set content owner', 400);
  }
  return resolved;
}
