import { User } from '../models/user';
import { Artist } from '../models/artist';
import { DeploymentMigration } from '../models/deploymentMigration';
import { parseObjectId } from '../controllers/admin/admin.helpers';
import { logger } from '../utils/logger';

export const ARTIST_USER_LINK_RECONCILE_MIGRATION = 'artist_user_link_reconcile_v1';

/**
 * One-time: align artist.user with user.artistId (bidirectional).
 */
export async function reconcileArtistUserLinksOnce(): Promise<void> {
  const existing = await DeploymentMigration.findOne({
    name: ARTIST_USER_LINK_RECONCILE_MIGRATION,
    status: 'completed',
  }).lean();

  if (existing) {
    logger.info('reconcileArtistUserLinksOnce: already completed, skipping');
    return;
  }

  let migrationId: string | undefined;

  try {
    const migration = await DeploymentMigration.create({
      name: ARTIST_USER_LINK_RECONCILE_MIGRATION,
      status: 'running',
    });
    migrationId = String(migration._id);
  } catch (err: unknown) {
    const isDuplicate =
      err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000;
    if (isDuplicate) return;
    throw err;
  }

  const stats = {
    usersUpdatedFromArtist: 0,
    artistsUpdatedFromUser: 0,
    conflicts: 0,
  };

  try {
    const userCursor = User.find({ artistId: { $ne: null } })
      .select('_id artistId')
      .lean()
      .cursor();

    for await (const user of userCursor) {
      if (user._id == null || user.artistId == null) continue;
      const userId = parseObjectId(String(user._id), '_id');
      const artistId = parseObjectId(String(user.artistId), 'artistId');
      const artist = await Artist.findById(artistId).select('user').lean();
      if (!artist) continue;

      const artistUserId =
        artist.user != null ? parseObjectId(String(artist.user), 'artist.user') : null;
      if (artistUserId != null && !artistUserId.equals(userId)) {
        stats.conflicts += 1;
        continue;
      }

      if (artistUserId == null || !artistUserId.equals(userId)) {
        await Artist.updateOne({ _id: artistId }, { $set: { user: userId } });
        stats.artistsUpdatedFromUser += 1;
      }
    }

    const artistCursor = Artist.find({ user: { $ne: null } })
      .select('_id user')
      .lean()
      .cursor();

    for await (const artist of artistCursor) {
      if (artist._id == null || artist.user == null) continue;
      const artistId = parseObjectId(String(artist._id), '_id');
      const artistUserId = parseObjectId(String(artist.user), 'artist.user');
      const user = await User.findById(artistUserId).select('artistId').lean();
      if (!user) continue;

      const userArtistId =
        user.artistId != null ? parseObjectId(String(user.artistId), 'artistId') : null;
      if (userArtistId != null && userArtistId.equals(artistId)) continue;

      if (userArtistId != null && !userArtistId.equals(artistId)) {
        stats.conflicts += 1;
        continue;
      }

      await User.updateOne({ _id: artistUserId, artistId: null }, { $set: { artistId } });
      stats.usersUpdatedFromArtist += 1;
    }

    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: { status: 'completed', completedAt: new Date(), stats },
    });
    logger.info('reconcileArtistUserLinksOnce: completed', stats);
  } catch (error) {
    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'failed',
        completedAt: new Date(),
        stats,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
