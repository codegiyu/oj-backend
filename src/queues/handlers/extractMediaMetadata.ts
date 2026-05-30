import type { Job } from 'bullmq';
import type { ExtractMediaMetadataJobData } from '../../lib/types/queues';
import { probeMediaUrl, updateEntityMetadata } from '../../services/mediaMetadata.service';
import { logger } from '../../utils/logger';

export async function extractMediaMetadata(job: Job<ExtractMediaMetadataJobData>): Promise<void> {
  const { entityType, entityId, mediaUrl, mediaKind } = job.data;

  const probe = await probeMediaUrl(mediaUrl, mediaKind);
  await updateEntityMetadata(entityType, entityId, probe);

  logger.info('Media metadata extracted', {
    jobId: job.id,
    entityType,
    entityId,
    mediaKind,
    durationSeconds: probe.durationSeconds,
  });
}
