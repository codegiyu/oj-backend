/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  artistUpdateManyMock,
  deploymentFindOneMock,
  deploymentCreateMock,
  deploymentFindByIdAndUpdateMock,
} = vi.hoisted(() => ({
  artistUpdateManyMock: vi.fn(),
  deploymentFindOneMock: vi.fn(),
  deploymentCreateMock: vi.fn(),
  deploymentFindByIdAndUpdateMock: vi.fn(),
}));

vi.mock('../../src/models/artist', () => ({
  Artist: {
    updateMany: artistUpdateManyMock,
  },
}));

vi.mock('../../src/models/deploymentMigration', () => ({
  DeploymentMigration: {
    findOne: deploymentFindOneMock,
    create: deploymentCreateMock,
    findByIdAndUpdate: deploymentFindByIdAndUpdateMock,
  },
}));

import { migrateArtistSpotlightFieldsOnce } from '../../src/seed/migrateArtistSpotlightFields';

describe('migrateArtistSpotlightFieldsOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deploymentFindOneMock.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    deploymentCreateMock.mockResolvedValue({ _id: 'migration-id' });
    deploymentFindByIdAndUpdateMock.mockResolvedValue({});
    artistUpdateManyMock.mockResolvedValue({ modifiedCount: 5 });
  });

  it('skips when migration already completed', async () => {
    deploymentFindOneMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ status: 'completed' }),
    });

    await migrateArtistSpotlightFieldsOnce();

    expect(artistUpdateManyMock).not.toHaveBeenCalled();
  });

  it('backfills spotlight fields from legacy featured flags', async () => {
    await migrateArtistSpotlightFieldsOnce();

    expect(artistUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.any(Array),
      }),
      expect.any(Array)
    );
    expect(deploymentFindByIdAndUpdateMock).toHaveBeenCalledWith(
      'migration-id',
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'completed',
          stats: { artistsUpdated: 5 },
        }),
      })
    );
  });
});
