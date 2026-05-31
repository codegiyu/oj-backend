import type { Job } from 'bullmq';
import type { SnapshotMusicDailyMetricsJobData } from '../../lib/types/queues';
import { snapshotAllPublishedMusicMetrics } from '../../repositories/charts/musicDailyMetrics.repository';
import { logger } from '../../utils/logger';

export async function snapshotMusicDailyMetrics(
  job: Job<SnapshotMusicDailyMetricsJobData>
): Promise<void> {
  const count = await snapshotAllPublishedMusicMetrics(new Date());

  logger.info('Music daily metrics snapshot completed', {
    jobId: job.id,
    trackCount: count,
  });
}
