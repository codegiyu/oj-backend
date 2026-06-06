/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  musicSnapshotMock,
  videoSnapshotMock,
  newsSnapshotMock,
  deploymentFindOneMock,
  deploymentCreateMock,
  deploymentFindByIdAndUpdateMock,
} = vi.hoisted(() => ({
  musicSnapshotMock: vi.fn(),
  videoSnapshotMock: vi.fn(),
  newsSnapshotMock: vi.fn(),
  deploymentFindOneMock: vi.fn(),
  deploymentCreateMock: vi.fn(),
  deploymentFindByIdAndUpdateMock: vi.fn(),
}));

vi.mock('../../src/repositories/charts/musicDailyMetrics.repository', () => ({
  snapshotAllPublishedMusicMetrics: musicSnapshotMock,
}));

vi.mock('../../src/repositories/charts/videoDailyMetrics.repository', () => ({
  snapshotAllPublishedVideoMetrics: videoSnapshotMock,
}));

vi.mock('../../src/repositories/charts/newsDailyMetrics.repository', () => ({
  snapshotAllPublishedNewsMetrics: newsSnapshotMock,
}));

vi.mock('../../src/models/deploymentMigration', () => ({
  DeploymentMigration: {
    findOne: deploymentFindOneMock,
    create: deploymentCreateMock,
    findByIdAndUpdate: deploymentFindByIdAndUpdateMock,
  },
}));

import { bootstrapMediaDailyMetricsOnce } from '../../src/seed/bootstrapMediaDailyMetricsOnce';

describe('bootstrapMediaDailyMetricsOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deploymentFindOneMock.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    deploymentCreateMock.mockResolvedValue({ _id: 'migration-id' });
    deploymentFindByIdAndUpdateMock.mockResolvedValue({});
    musicSnapshotMock.mockResolvedValue(10);
    videoSnapshotMock.mockResolvedValue(20);
    newsSnapshotMock.mockResolvedValue(30);
  });

  it('skips when migration already completed', async () => {
    deploymentFindOneMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ status: 'completed' }),
    });

    await bootstrapMediaDailyMetricsOnce();

    expect(musicSnapshotMock).not.toHaveBeenCalled();
    expect(videoSnapshotMock).not.toHaveBeenCalled();
    expect(newsSnapshotMock).not.toHaveBeenCalled();
  });

  it('snapshots music, video, and news daily metrics', async () => {
    await bootstrapMediaDailyMetricsOnce();

    expect(musicSnapshotMock).toHaveBeenCalledOnce();
    expect(videoSnapshotMock).toHaveBeenCalledOnce();
    expect(newsSnapshotMock).toHaveBeenCalledOnce();
    expect(deploymentFindByIdAndUpdateMock).toHaveBeenCalledWith(
      'migration-id',
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'completed',
          stats: {
            musicSnapshots: 10,
            videoSnapshots: 20,
            newsSnapshots: 30,
          },
        }),
      })
    );
  });
});
