import { Product } from '../models/product';
import { DeploymentMigration } from '../models/deploymentMigration';
import { logger } from '../utils/logger';
import { defaultSimpleProductSku } from '../utils/marketplaceProductSku';

export const PRODUCT_UNLIMITED_INVENTORY_BACKFILL_MIGRATION =
  'product_unlimited_inventory_backfill_v1';

type BackfillStats = {
  productsUpdated: number;
  simpleSkuBackfilled: number;
};

/**
 * One-time deployment migration: set unlimited inventory on all products and restore
 * inStock flags that were cleared by legacy post-checkout depletion.
 */
export async function backfillProductUnlimitedInventoryOnce(): Promise<void> {
  const existing = await DeploymentMigration.findOne({
    name: PRODUCT_UNLIMITED_INVENTORY_BACKFILL_MIGRATION,
    status: 'completed',
  }).lean();

  if (existing) {
    logger.info('backfillProductUnlimitedInventoryOnce: already completed, skipping');
    return;
  }

  let migrationId: string | undefined;

  try {
    const migration = await DeploymentMigration.create({
      name: PRODUCT_UNLIMITED_INVENTORY_BACKFILL_MIGRATION,
      status: 'running',
    });
    migrationId = String(migration._id);
  } catch (err: unknown) {
    const isDuplicate =
      err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000;

    if (isDuplicate) {
      const inProgress = await DeploymentMigration.findOne({
        name: PRODUCT_UNLIMITED_INVENTORY_BACKFILL_MIGRATION,
      }).lean();

      if (inProgress?.status === 'completed') return;

      logger.info(
        'backfillProductUnlimitedInventoryOnce: another instance is running or already claimed'
      );
      return;
    }

    throw err;
  }

  const stats: BackfillStats = {
    productsUpdated: 0,
    simpleSkuBackfilled: 0,
  };

  try {
    await Product.updateMany(
      { 'variants.0': { $exists: true } },
      {
        $set: {
          inventoryMode: 'unlimited',
          inStock: true,
          'variants.$[].inStock': true,
        },
      }
    );

    await Product.updateMany(
      { $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }] },
      { $set: { inventoryMode: 'unlimited', inStock: true } }
    );

    const simpleWithoutSku = Product.find({
      $and: [
        { $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }] },
        { $or: [{ sku: { $exists: false } }, { sku: '' }, { sku: null }] },
      ],
    }).cursor();

    for await (const doc of simpleWithoutSku) {
      doc.sku = defaultSimpleProductSku(doc.slug);
      await doc.save();
      stats.simpleSkuBackfilled += 1;
    }

    stats.productsUpdated = await Product.countDocuments({ inventoryMode: 'unlimited' });

    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        stats,
      },
    });

    logger.info('backfillProductUnlimitedInventoryOnce: completed', stats);
  } catch (error) {
    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'failed',
        completedAt: new Date(),
        stats,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    logger.error('backfillProductUnlimitedInventoryOnce: failed', { error, stats });
    throw error;
  }
}
