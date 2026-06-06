import { Video } from '../models/video';
import { DeploymentMigration } from '../models/deploymentMigration';
import { logger } from '../utils/logger';

export const VIDEO_MOVIE_CATEGORY_MIGRATION = 'video-movie-category-to-movies-v1';

type MigrationStats = {
  videosUpdated: number;
};

/**
 * One-time deployment migration: rename legacy video category slug `movie` → `movies`.
 */
export async function migrateVideoMovieCategoryOnce(): Promise<void> {
  const existing = await DeploymentMigration.findOne({
    name: VIDEO_MOVIE_CATEGORY_MIGRATION,
    status: 'completed',
  }).lean();

  if (existing) {
    logger.info('migrateVideoMovieCategoryOnce: already completed, skipping');
    return;
  }

  let migrationId: string | undefined;

  try {
    const migration = await DeploymentMigration.create({
      name: VIDEO_MOVIE_CATEGORY_MIGRATION,
      status: 'running',
    });
    migrationId = String(migration._id);
  } catch (err: unknown) {
    const isDuplicate =
      err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000;

    if (isDuplicate) {
      const inProgress = await DeploymentMigration.findOne({
        name: VIDEO_MOVIE_CATEGORY_MIGRATION,
      }).lean();

      if (inProgress?.status === 'completed') return;

      logger.info('migrateVideoMovieCategoryOnce: another instance is running or already claimed');
      return;
    }

    throw err;
  }

  const stats: MigrationStats = { videosUpdated: 0 };

  try {
    const result = await Video.updateMany({ category: 'movie' }, { $set: { category: 'movies' } });
    stats.videosUpdated = result.modifiedCount ?? 0;

    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        stats,
      },
    });

    logger.info('migrateVideoMovieCategoryOnce: completed', stats);
  } catch (error) {
    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'failed',
        completedAt: new Date(),
        stats,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    logger.error('migrateVideoMovieCategoryOnce: failed', { error, stats });
    throw error;
  }
}
