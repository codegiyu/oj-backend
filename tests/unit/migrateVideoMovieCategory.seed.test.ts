import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  videoUpdateManyMock,
  deploymentFindOneMock,
  deploymentCreateMock,
  deploymentFindByIdAndUpdateMock,
} = vi.hoisted(() => ({
  videoUpdateManyMock: vi.fn(),
  deploymentFindOneMock: vi.fn(),
  deploymentCreateMock: vi.fn(),
  deploymentFindByIdAndUpdateMock: vi.fn(),
}));

vi.mock('../../src/models/video', () => ({
  Video: {
    updateMany: videoUpdateManyMock,
  },
}));

vi.mock('../../src/models/deploymentMigration', () => ({
  DeploymentMigration: {
    findOne: deploymentFindOneMock,
    create: deploymentCreateMock,
    findByIdAndUpdate: deploymentFindByIdAndUpdateMock,
  },
}));

import { migrateVideoMovieCategoryOnce } from '../../src/seed/migrateVideoMovieCategory';

describe('migrateVideoMovieCategoryOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deploymentFindOneMock.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    deploymentCreateMock.mockResolvedValue({ _id: 'migration-id' });
    deploymentFindByIdAndUpdateMock.mockResolvedValue({});
    videoUpdateManyMock.mockResolvedValue({ modifiedCount: 3 });
  });

  it('skips when migration already completed', async () => {
    deploymentFindOneMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ status: 'completed' }),
    });

    await migrateVideoMovieCategoryOnce();

    expect(videoUpdateManyMock).not.toHaveBeenCalled();
  });

  it('updates legacy movie categories to movies', async () => {
    await migrateVideoMovieCategoryOnce();

    expect(videoUpdateManyMock).toHaveBeenCalledWith(
      { category: 'movie' },
      { $set: { category: 'movies' } }
    );
    expect(deploymentFindByIdAndUpdateMock).toHaveBeenCalledWith(
      'migration-id',
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'completed',
          stats: { videosUpdated: 3 },
        }),
      })
    );
  });
});
