import type { Job } from 'bullmq';
import type { SnapshotNewsDailyMetricsJobData } from '../../lib/types/queues';
import { snapshotAllPublishedNewsMetrics } from '../../repositories/charts/newsDailyMetrics.repository';
import { logger } from '../../utils/logger';

export async function snapshotNewsDailyMetrics(
  job: Job<SnapshotNewsDailyMetricsJobData>
): Promise<void> {
  const count = await snapshotAllPublishedNewsMetrics(new Date());

  logger.info('News daily metrics snapshot completed', {
    jobId: job.id,
    articleCount: count,
  });
}
