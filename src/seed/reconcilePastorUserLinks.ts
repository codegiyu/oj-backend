import { User } from '../models/user';
import { Pastor } from '../models/pastor';
import { DeploymentMigration } from '../models/deploymentMigration';
import { parseObjectId } from '../controllers/admin/admin.helpers';
import { logger } from '../utils/logger';

export const PASTOR_USER_LINK_RECONCILE_MIGRATION = 'pastor_user_link_reconcile_v1';

/**
 * One-time: align pastor.user with user.pastorId (bidirectional).
 */
export async function reconcilePastorUserLinksOnce(): Promise<void> {
  const existing = await DeploymentMigration.findOne({
    name: PASTOR_USER_LINK_RECONCILE_MIGRATION,
    status: 'completed',
  }).lean();

  if (existing) {
    logger.info('reconcilePastorUserLinksOnce: already completed, skipping');
    return;
  }

  let migrationId: string | undefined;

  try {
    const migration = await DeploymentMigration.create({
      name: PASTOR_USER_LINK_RECONCILE_MIGRATION,
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
    usersUpdatedFromPastor: 0,
    pastorsUpdatedFromUser: 0,
    conflicts: 0,
  };

  try {
    const userCursor = User.find({ pastorId: { $ne: null } })
      .select('_id pastorId')
      .lean()
      .cursor();

    for await (const user of userCursor) {
      if (user._id == null || user.pastorId == null) continue;
      const userId = parseObjectId(String(user._id), '_id');
      const pastorId = parseObjectId(String(user.pastorId), 'pastorId');
      const pastor = await Pastor.findById(pastorId).select('user').lean();
      if (!pastor) continue;

      const pastorUserId =
        pastor.user != null ? parseObjectId(String(pastor.user), 'pastor.user') : null;
      if (pastorUserId != null && !pastorUserId.equals(userId)) {
        stats.conflicts += 1;
        continue;
      }

      if (pastorUserId == null || !pastorUserId.equals(userId)) {
        await Pastor.updateOne({ _id: pastorId }, { $set: { user: userId } });
        stats.pastorsUpdatedFromUser += 1;
      }
    }

    const pastorCursor = Pastor.find({ user: { $ne: null } })
      .select('_id user')
      .lean()
      .cursor();

    for await (const pastor of pastorCursor) {
      if (pastor._id == null || pastor.user == null) continue;
      const pastorId = parseObjectId(String(pastor._id), '_id');
      const pastorUserId = parseObjectId(String(pastor.user), 'pastor.user');
      const user = await User.findById(pastorUserId).select('pastorId').lean();
      if (!user) continue;

      const userPastorId =
        user.pastorId != null ? parseObjectId(String(user.pastorId), 'pastorId') : null;
      if (userPastorId != null && userPastorId.equals(pastorId)) continue;

      if (userPastorId != null && !userPastorId.equals(pastorId)) {
        stats.conflicts += 1;
        continue;
      }

      await User.updateOne({ _id: pastorUserId, pastorId: null }, { $set: { pastorId } });
      stats.usersUpdatedFromPastor += 1;
    }

    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: { status: 'completed', completedAt: new Date(), stats },
    });
    logger.info('reconcilePastorUserLinksOnce: completed', stats);
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
