import type { Job } from 'bullmq';
import type { FinalizeMusicChartSnapshotsJobData } from '../../lib/types/queues';
import type { ChartPeriod } from '../../constants/musicSections';
import { resolveChartWindow } from '../../constants/musicSections';
import { pruneChartSnapshots } from '../../repositories/charts/musicChartSnapshot.repository';
import {
  computeChartRankings,
  listRegisteredChartScopes,
} from '../../services/musicCharts.service';
import { clearNamespace } from '../../utils/cache';
import { logger } from '../../utils/logger';

const RETENTION_BY_PERIOD: Record<ChartPeriod, number> = {
  weekly: 26,
  monthly: 13,
  alltime: 13,
};

export async function finalizeMusicChartSnapshots(
  job: Job<FinalizeMusicChartSnapshotsJobData>
): Promise<void> {
  const scopeSet = new Set<string>(['all', ...(await listRegisteredChartScopes())]);
  const periods: ChartPeriod[] = ['weekly', 'monthly', 'alltime'];

  for (const scopeKey of scopeSet) {
    for (const period of periods) {
      const window = resolveChartWindow(period);
      await computeChartRankings({ scopeKey, period, window });
      await pruneChartSnapshots(scopeKey, period, RETENTION_BY_PERIOD[period]);
    }
  }

  await clearNamespace('vol:chart:');

  logger.info('Music chart snapshots finalized', {
    jobId: job.id,
    scopeCount: scopeSet.size,
  });
}
