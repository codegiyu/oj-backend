import { Music } from '../models/music';
import { Video } from '../models/video';
import { DeploymentMigration } from '../models/deploymentMigration';
import { logger } from '../utils/logger';
import { enqueueMediaMetadataProbe } from '../utils/mediaMetadataEnqueue';
import {
  MEDIA_METADATA_BACKFILL_MIGRATION,
  resolveMusicProbeTarget,
  resolveVideoProbeTarget,
  shouldBackfillMediaMetadata,
} from '../utils/mediaMetadataBackfill';

type BackfillStats = {
  musicScanned: number;
  videoScanned: number;
  musicEnqueued: number;
  videoEnqueued: number;
  musicSkippedComplete: number;
  videoSkippedComplete: number;
  musicSkippedNoUrl: number;
  videoSkippedNoUrl: number;
};

/**
 * One-time deployment migration: enqueue metadata probe jobs for existing music/video
 * that have probeable media URLs but no stored duration yet.
 */
export async function backfillMediaMetadataOnce(): Promise<void> {
  const existing = await DeploymentMigration.findOne({
    name: MEDIA_METADATA_BACKFILL_MIGRATION,
    status: 'completed',
  }).lean();

  if (existing) {
    logger.info('backfillMediaMetadataOnce: already completed, skipping');
    return;
  }

  let migrationId: string | undefined;

  try {
    const migration = await DeploymentMigration.create({
      name: MEDIA_METADATA_BACKFILL_MIGRATION,
      status: 'running',
    });
    migrationId = String(migration._id);
  } catch (err: unknown) {
    const isDuplicate =
      err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000;

    if (isDuplicate) {
      const inProgress = await DeploymentMigration.findOne({
        name: MEDIA_METADATA_BACKFILL_MIGRATION,
      }).lean();

      if (inProgress?.status === 'completed') return;

      logger.info('backfillMediaMetadataOnce: another instance is running or already claimed');
      return;
    }

    throw err;
  }

  const stats: BackfillStats = {
    musicScanned: 0,
    videoScanned: 0,
    musicEnqueued: 0,
    videoEnqueued: 0,
    musicSkippedComplete: 0,
    videoSkippedComplete: 0,
    musicSkippedNoUrl: 0,
    videoSkippedNoUrl: 0,
  };

  try {
    const musicCursor = Music.find({}).select('_id audioUrl videoUrl metadata').lean().cursor();

    for await (const doc of musicCursor) {
      stats.musicScanned += 1;

      if (!shouldBackfillMediaMetadata(doc.metadata)) {
        stats.musicSkippedComplete += 1;
        continue;
      }

      const target = resolveMusicProbeTarget(doc);
      if (!target) {
        stats.musicSkippedNoUrl += 1;
        continue;
      }

      const jobId = await enqueueMediaMetadataProbe({
        entityType: 'music',
        entityId: String(doc._id),
        mediaUrl: target.mediaUrl,
        mediaKind: target.mediaKind,
      });

      if (jobId) stats.musicEnqueued += 1;
    }

    const videoCursor = Video.find({}).select('_id videoFileUrl videoUrl metadata').lean().cursor();

    for await (const doc of videoCursor) {
      stats.videoScanned += 1;

      if (!shouldBackfillMediaMetadata(doc.metadata)) {
        stats.videoSkippedComplete += 1;
        continue;
      }

      const target = resolveVideoProbeTarget(doc);
      if (!target) {
        stats.videoSkippedNoUrl += 1;
        continue;
      }

      const jobId = await enqueueMediaMetadataProbe({
        entityType: 'video',
        entityId: String(doc._id),
        mediaUrl: target.mediaUrl,
        mediaKind: target.mediaKind,
      });

      if (jobId) stats.videoEnqueued += 1;
    }

    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        stats,
      },
    });

    logger.info('backfillMediaMetadataOnce: completed', stats);
  } catch (error) {
    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'failed',
        completedAt: new Date(),
        stats,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    logger.error('backfillMediaMetadataOnce: failed', { error, stats });
    throw error;
  }
}
