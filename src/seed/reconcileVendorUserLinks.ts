import { User } from '../models/user';
import { Vendor } from '../models/vendor';
import { DeploymentMigration } from '../models/deploymentMigration';
import { parseObjectId } from '../controllers/admin/admin.helpers';
import { logger } from '../utils/logger';

export const VENDOR_USER_LINK_RECONCILE_MIGRATION = 'vendor_user_link_reconcile_v1';

export type VendorLinkReconcileStats = {
  usersScanned: number;
  vendorsUpdatedFromUser: number;
  usersUpdatedFromVendor: number;
  conflicts: number;
  missingVendor: number;
};

/**
 * One-time deployment migration: align vendor.user with user.vendorId (bidirectional links).
 */
export async function reconcileVendorUserLinksOnce(): Promise<void> {
  const existing = await DeploymentMigration.findOne({
    name: VENDOR_USER_LINK_RECONCILE_MIGRATION,
    status: 'completed',
  }).lean();

  if (existing) {
    logger.info('reconcileVendorUserLinksOnce: already completed, skipping');
    return;
  }

  let migrationId: string | undefined;

  try {
    const migration = await DeploymentMigration.create({
      name: VENDOR_USER_LINK_RECONCILE_MIGRATION,
      status: 'running',
    });
    migrationId = String(migration._id);
  } catch (err: unknown) {
    const isDuplicate =
      err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000;

    if (isDuplicate) {
      const inProgress = await DeploymentMigration.findOne({
        name: VENDOR_USER_LINK_RECONCILE_MIGRATION,
      }).lean();

      if (inProgress?.status === 'completed') return;

      logger.info('reconcileVendorUserLinksOnce: another instance is running or already claimed');
      return;
    }

    throw err;
  }

  const stats: VendorLinkReconcileStats = {
    usersScanned: 0,
    vendorsUpdatedFromUser: 0,
    usersUpdatedFromVendor: 0,
    conflicts: 0,
    missingVendor: 0,
  };

  try {
    const userCursor = User.find({ vendorId: { $ne: null } })
      .select('_id vendorId')
      .lean()
      .cursor();

    for await (const user of userCursor) {
      stats.usersScanned += 1;
      if (user._id == null || user.vendorId == null) continue;

      const userId = parseObjectId(String(user._id), '_id');
      const vendorId = parseObjectId(String(user.vendorId), 'vendorId');

      const vendor = await Vendor.findById(vendorId).select('user').lean();
      if (!vendor) {
        stats.missingVendor += 1;
        continue;
      }

      const vendorUserId =
        vendor.user != null ? parseObjectId(String(vendor.user), 'vendor.user') : null;
      if (vendorUserId != null && !vendorUserId.equals(userId)) {
        stats.conflicts += 1;
        logger.warn('reconcileVendorUserLinksOnce: vendor.user conflicts with user.vendorId', {
          userId: String(userId),
          vendorId: String(vendorId),
          vendorUserId: String(vendorUserId),
        });
        continue;
      }

      if (vendorUserId == null || !vendorUserId.equals(userId)) {
        await Vendor.updateOne({ _id: vendorId }, { $set: { user: userId } });
        stats.vendorsUpdatedFromUser += 1;
      }
    }

    const vendorCursor = Vendor.find({ user: { $ne: null } })
      .select('_id user')
      .lean()
      .cursor();

    for await (const vendor of vendorCursor) {
      if (vendor._id == null || vendor.user == null) continue;

      const vendorId = parseObjectId(String(vendor._id), '_id');
      const vendorUserId = parseObjectId(String(vendor.user), 'vendor.user');

      const user = await User.findById(vendorUserId).select('vendorId').lean();
      if (!user) continue;

      const userVendorId =
        user.vendorId != null ? parseObjectId(String(user.vendorId), 'vendorId') : null;
      if (userVendorId != null && userVendorId.equals(vendorId)) continue;

      if (userVendorId != null && !userVendorId.equals(vendorId)) {
        stats.conflicts += 1;
        logger.warn('reconcileVendorUserLinksOnce: user.vendorId conflicts with vendor.user', {
          userId: String(vendorUserId),
          vendorId: String(vendorId),
          userVendorId: String(userVendorId),
        });
        continue;
      }

      await User.updateOne({ _id: vendorUserId, vendorId: null }, { $set: { vendorId } });
      stats.usersUpdatedFromVendor += 1;
    }

    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        stats,
      },
    });

    logger.info('reconcileVendorUserLinksOnce: completed', stats);
  } catch (error) {
    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'failed',
        completedAt: new Date(),
        stats,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    logger.error('reconcileVendorUserLinksOnce: failed', { error, stats });
    throw error;
  }
}
