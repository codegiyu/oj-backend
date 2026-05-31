import { Pastor } from '../models/pastor';
import { AskPastorQuestion } from '../models/askPastorQuestion';
import { DeploymentMigration } from '../models/deploymentMigration';
import { logger } from '../utils/logger';

export const PASTOR_ASK_DATA_WIPE_MIGRATION = 'pastor-ask-data-wipe-v1';

type WipeStats = {
  pastorsDeleted: number;
  questionsDeleted: number;
};

/**
 * One-time deployment migration: wipe legacy pastor and ask-a-pastor question data
 * before the redesigned pastor feature rollout.
 */
export async function wipePastorAskDataOnce(): Promise<void> {
  const existing = await DeploymentMigration.findOne({
    name: PASTOR_ASK_DATA_WIPE_MIGRATION,
    status: 'completed',
  }).lean();

  if (existing) {
    logger.info('wipePastorAskDataOnce: already completed, skipping');
    return;
  }

  let migrationId: string | undefined;

  try {
    const migration = await DeploymentMigration.create({
      name: PASTOR_ASK_DATA_WIPE_MIGRATION,
      status: 'running',
    });
    migrationId = String(migration._id);
  } catch (err: unknown) {
    const isDuplicate =
      err && typeof err === 'object' && 'code' in err && (err as { code?: number }).code === 11000;

    if (isDuplicate) {
      const inProgress = await DeploymentMigration.findOne({
        name: PASTOR_ASK_DATA_WIPE_MIGRATION,
      }).lean();

      if (inProgress?.status === 'completed') return;

      logger.info('wipePastorAskDataOnce: another instance is running or already claimed');
      return;
    }

    throw err;
  }

  const stats: WipeStats = {
    pastorsDeleted: 0,
    questionsDeleted: 0,
  };

  try {
    const pastorResult = await Pastor.deleteMany({});
    stats.pastorsDeleted = pastorResult.deletedCount ?? 0;

    const questionResult = await AskPastorQuestion.deleteMany({});
    stats.questionsDeleted = questionResult.deletedCount ?? 0;

    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        stats,
      },
    });

    logger.info('wipePastorAskDataOnce: completed', stats);
  } catch (error) {
    await DeploymentMigration.findByIdAndUpdate(migrationId, {
      $set: {
        status: 'failed',
        completedAt: new Date(),
        stats,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    logger.error('wipePastorAskDataOnce: failed', { error, stats });
    throw error;
  }
}
