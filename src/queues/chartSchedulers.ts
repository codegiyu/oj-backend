import { mainQueue } from './main.queue';
import { logger } from '../utils/logger';

const DAILY_METRICS_CRON = '10 0 * * *';
const FINALIZE_CHARTS_CRON = '30 0 * * *';
const RECONCILE_ARTIST_FOLLOWERS_CRON = '0 3 * * 0';

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
    'snapshot-video-daily-metrics',
    { pattern: DAILY_METRICS_CRON },
    {
      name: 'snapshotVideoDailyMetrics',
      data: { type: 'snapshotVideoDailyMetrics' },
    }
  );

  await mainQueue.upsertJobScheduler(
    'snapshot-news-daily-metrics',
    { pattern: DAILY_METRICS_CRON },
    {
      name: 'snapshotNewsDailyMetrics',
      data: { type: 'snapshotNewsDailyMetrics' },
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

  await mainQueue.upsertJobScheduler(
    'reconcile-artist-follower-counts',
    { pattern: RECONCILE_ARTIST_FOLLOWERS_CRON },
    {
      name: 'reconcileArtistFollowerCounts',
      data: { type: 'reconcileArtistFollowerCounts' },
    }
  );

  logger.info('Chart job schedulers registered');
}
