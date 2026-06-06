import type { Job } from 'bullmq';
import type { SnapshotVideoDailyMetricsJobData } from '../../lib/types/queues';
import { snapshotAllPublishedVideoMetrics } from '../../repositories/charts/videoDailyMetrics.repository';
import { logger } from '../../utils/logger';

export async function snapshotVideoDailyMetrics(
  job: Job<SnapshotVideoDailyMetricsJobData>
): Promise<void> {
  const count = await snapshotAllPublishedVideoMetrics(new Date());

  logger.info('Video daily metrics snapshot completed', {
    jobId: job.id,
    videoCount: count,
  });
}
