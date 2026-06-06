import { Artist } from '../models/artist';
import { DeploymentMigration } from '../models/deploymentMigration';
import { logger } from '../utils/logger';

export const ARTIST_SPOTLIGHT_FIELDS_MIGRATION = 'artist_spotlight_fields_v1';

type MigrationStats = {
  artistsUpdated: number;
};

/**
 * Copy legacy isFeatured/displayOrder into scoped artist spotlight fields.
 */
export async function migrateArtistSpotlightFields(): Promise<{ updated: number }> {
  const result = await Artist.updateMany(
    {
      $or: [
        { isMusicFeatured: { $exists: false } },
        { isRising: { $exists: false } },
        { isCreatorSpotlight: { $exists: false } },
      ],
    },
    [
      {
        $set: {
          isMusicFeatured: { $ifNull: ['$isMusicFeatured', '$isFeatured'] },
          isRising: { $ifNull: ['$isRising', false] },
          isCreatorSpotlight: { $ifNull: ['$isCreatorSpotlight', false] },
          musicFeaturedDisplayOrder: {
            $ifNull: ['$musicFeaturedDisplayOrder', '$displayOrder'],
          },
          risingArtistDisplayOrder: { $ifNull: ['$risingArtistDisplayOrder', 0] },
          creatorSpotlightDisplayOrder: { $ifNull: ['$creatorSpotlightDisplayOrder', 0] },
        },
      },
    ],
    { updatePipeline: true }
  );

  return { updated: result.modifiedCount };
}

/**
 * One-time deployment migration: backfill artist spotlight flags and display orders.
 */
export async function migrateArtistSpotlightFieldsOnce(): Promise<void> {
  const existing = await DeploymentMigration.findOne({
    name: ARTIST_SPOTLIGHT_FIELDS_MIGRATION,
    status: 'completed',
  }).lean();

  if (existing) {
    logger.info('migrateArtistSpotlightFieldsOnce: already completed, skipping');
    return;
  }

  let migrationId: string | undefined;

  const failedMigration = await DeploymentMigration.findOne({
    name: ARTIST_SPOTLIGHT_FIELDS_MIGRATION,
    status: 'failed',
  }).lean();

  if (failedMigration?._id) {
    await DeploymentMigration.findByIdAndUpdate(failedMigration._id, {
      $set: { status: 'running', errorMessage: '', startedAt: new Date() },
    });
    migrationId = String(failedMigration._id);
  } else {
    const runningMigration = await DeploymentMigration.findOne({
      name: ARTIST_SPOTLIGHT_FIELDS_MIGRATION,
      status: 'running',
    }).lean();

    if (runningMigration) {
      logger.info(
        'migrateArtistSpotlightFieldsOnce: another instance is running or already claimed'
      );
      return;
    }

    try {
      const migration = await DeploymentMigration.create({
        name: ARTIST_SPOTLIGHT_FIELDS_MIGRATION,
        status: 'running',
      });
      migrationId = String(migration._id);
    } catch (err: unknown) {
      const isDuplicate =
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: number }).code === 11000;

      if (isDuplicate) {
        const existing = await DeploymentMigration.findOne({
          name: ARTIST_SPOTLIGHT_FIELDS_MIGRATION,
        }).lean();

        if (existing?.status === 'completed') return;

        if (existing?.status === 'failed' && existing._id) {
          await DeploymentMigration.findByIdAndUpdate(existing._id, {
            $set: { status: 'running', errorMessage: '', startedAt: new Date() },
          });
          migrationId = String(existing._id);
        } else {
          logger.info(
            'migrateArtistSpotlightFieldsOnce: another instance is running or already claimed'
          );
          return;
        }
      } else {
        throw err;
      }
    }
  }

  const stats: MigrationStats = { artistsUpdated: 0 };

  try {
    const result = await migrateArtistSpotlightFields();
    stats.artistsUpdated = result.updated;

    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        stats,
      },
    });

    logger.info('migrateArtistSpotlightFieldsOnce: completed', stats);
  } catch (error) {
    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'failed',
        completedAt: new Date(),
        stats,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    logger.error('migrateArtistSpotlightFieldsOnce: failed', { error, stats });
    throw error;
  }
}
