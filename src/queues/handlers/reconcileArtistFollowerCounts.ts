import type { Job } from 'bullmq';
import type { ReconcileArtistFollowerCountsJobData } from '../../lib/types/queues';
import { Artist } from '../../models/artist';
import { countFollowsByArtist } from '../../repositories/community/artistFollow.repository';
import { leanIdToString } from '../../utils/leanId';
import { logger } from '../../utils/logger';

export async function reconcileArtistFollowerCounts(
  job: Job<ReconcileArtistFollowerCountsJobData>
): Promise<void> {
  const counts = await countFollowsByArtist();
  const countedArtistIds = counts.map(row => row.artistId);

  if (counts.length > 0) {
    await Artist.bulkWrite(
      counts.map(row => ({
        updateOne: {
          filter: { _id: row.artistId },
          update: { $set: { followerCount: row.count } },
        },
      }))
    );
  }

  const resetFilter: Record<string, unknown> = { followerCount: { $gt: 0 } };
  if (countedArtistIds.length > 0) {
    resetFilter._id = { $nin: countedArtistIds };
  }

  const resetResult = await Artist.updateMany(resetFilter, { $set: { followerCount: 0 } });

  logger.info('Artist follower counts reconciled', {
    jobId: job.id,
    artistsUpdated: counts.length,
    artistsReset: resetResult.modifiedCount,
    sampleArtistIds: countedArtistIds.slice(0, 5).map(id => leanIdToString(id)),
  });
}
