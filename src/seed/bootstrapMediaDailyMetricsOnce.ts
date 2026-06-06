import { DeploymentMigration } from '../models/deploymentMigration';
import { snapshotAllPublishedMusicMetrics } from '../repositories/charts/musicDailyMetrics.repository';
import { snapshotAllPublishedVideoMetrics } from '../repositories/charts/videoDailyMetrics.repository';
import { snapshotAllPublishedNewsMetrics } from '../repositories/charts/newsDailyMetrics.repository';
import { logger } from '../utils/logger';

export const MEDIA_DAILY_METRICS_BOOTSTRAP_MIGRATION = 'media_daily_metrics_bootstrap_v1';

type BootstrapStats = {
  musicSnapshots: number;
  videoSnapshots: number;
  newsSnapshots: number;
};

/**
 * One-time deployment migration: seed initial daily metric snapshots so rolling-window
 * trending (music charts, video, news) has baseline data before the nightly cron runs.
 */
export async function bootstrapMediaDailyMetricsOnce(): Promise<void> {
  const existing = await DeploymentMigration.findOne({
    name: MEDIA_DAILY_METRICS_BOOTSTRAP_MIGRATION,
    status: 'completed',
  }).lean();

  if (existing) {
    logger.info('bootstrapMediaDailyMetricsOnce: already completed, skipping');
    return;
  }

  let migrationId: string | undefined;

  try {
    const migration = await DeploymentMigration.create({
      name: MEDIA_DAILY_METRICS_BOOTSTRAP_MIGRATION,
      status: 'running',
    });
    migrationId = String(migration._id);
  } catch (err: unknown) {
    const isDuplicate =
      err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000;

    if (isDuplicate) {
      const inProgress = await DeploymentMigration.findOne({
        name: MEDIA_DAILY_METRICS_BOOTSTRAP_MIGRATION,
      }).lean();

      if (inProgress?.status === 'completed') return;

      logger.info('bootstrapMediaDailyMetricsOnce: another instance is running or already claimed');
      return;
    }

    throw err;
  }

  const stats: BootstrapStats = {
    musicSnapshots: 0,
    videoSnapshots: 0,
    newsSnapshots: 0,
  };

  try {
    const snapshotDate = new Date();

    const [musicSnapshots, videoSnapshots, newsSnapshots] = await Promise.all([
      snapshotAllPublishedMusicMetrics(snapshotDate),
      snapshotAllPublishedVideoMetrics(snapshotDate),
      snapshotAllPublishedNewsMetrics(snapshotDate),
    ]);

    stats.musicSnapshots = musicSnapshots;
    stats.videoSnapshots = videoSnapshots;
    stats.newsSnapshots = newsSnapshots;

    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        stats,
      },
    });

    logger.info('bootstrapMediaDailyMetricsOnce: completed', stats);
  } catch (error) {
    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'failed',
        completedAt: new Date(),
        stats,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    logger.error('bootstrapMediaDailyMetricsOnce: failed', { error, stats });
    throw error;
  }
}
