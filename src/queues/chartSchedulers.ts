import { mainQueue } from './main.queue';
import { logger } from '../utils/logger';

const DAILY_METRICS_CRON = '10 0 * * *';
const FINALIZE_CHARTS_CRON = '30 0 * * *';

export async function registerChartJobSchedulers(): Promise<void> {
  await mainQueue.upsertJobScheduler(
    'snapshot-music-daily-metrics',
    { pattern: DAILY_METRICS_CRON },
    {
      name: 'snapshotMusicDailyMetrics',
      data: { type: 'snapshotMusicDailyMetrics' },
    }
  );

  await mainQueue.upsertJobScheduler(
    'finalize-music-chart-snapshots',
    { pattern: FINALIZE_CHARTS_CRON },
    {
      name: 'finalizeMusicChartSnapshots',
      data: { type: 'finalizeMusicChartSnapshots' },
    }
  );

  logger.info('Chart job schedulers registered');
}
