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

import {
  migrateArtistSpotlightFields,
  migrateArtistSpotlightFieldsOnce,
} from '../../src/seed/migrateArtistSpotlightFields';

function mockDeploymentFindOne(options: {
  completed?: Record<string, unknown> | null;
  failed?: Record<string, unknown> | null;
  running?: Record<string, unknown> | null;
  byName?: Record<string, unknown> | null;
}) {
  deploymentFindOneMock.mockImplementation((query: { status?: string; name?: string }) => {
    let value: Record<string, unknown> | null = null;

    if (query.status === 'completed') value = options.completed ?? null;
    else if (query.status === 'failed') value = options.failed ?? null;
    else if (query.status === 'running') value = options.running ?? null;
    else if (query.name && !query.status) value = options.byName ?? null;

    return { lean: vi.fn().mockResolvedValue(value) };
  });
}

describe('migrateArtistSpotlightFields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    artistUpdateManyMock.mockResolvedValue({ modifiedCount: 3 });
  });

  it('uses Mongoose pipeline update option for aggregation backfill', async () => {
    await migrateArtistSpotlightFields();

    expect(artistUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.any(Array),
      }),
      expect.any(Array),
      { updatePipeline: true }
    );
  });
});

describe('migrateArtistSpotlightFieldsOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeploymentFindOne({});
    deploymentCreateMock.mockResolvedValue({ _id: 'migration-id' });
    deploymentFindByIdAndUpdateMock.mockResolvedValue({});
    artistUpdateManyMock.mockResolvedValue({ modifiedCount: 5 });
  });

  it('skips when migration already completed', async () => {
    mockDeploymentFindOne({ completed: { status: 'completed' } });

    await migrateArtistSpotlightFieldsOnce();

    expect(artistUpdateManyMock).not.toHaveBeenCalled();
  });

  it('backfills spotlight fields from legacy featured flags', async () => {
    await migrateArtistSpotlightFieldsOnce();

    expect(artistUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.any(Array),
      }),
      expect.any(Array),
      { updatePipeline: true }
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

  it('retries when a previous run left the migration in failed state', async () => {
    mockDeploymentFindOne({ failed: { _id: 'failed-migration-id', status: 'failed' } });

    await migrateArtistSpotlightFieldsOnce();

    expect(deploymentCreateMock).not.toHaveBeenCalled();
    expect(deploymentFindByIdAndUpdateMock).toHaveBeenCalledWith(
      'failed-migration-id',
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'running',
          errorMessage: '',
        }),
      })
    );
    expect(deploymentFindByIdAndUpdateMock).toHaveBeenCalledWith(
      'failed-migration-id',
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'completed',
          stats: { artistsUpdated: 5 },
        }),
      })
    );
  });

  it('skips when another instance already claimed a running migration', async () => {
    mockDeploymentFindOne({ running: { _id: 'running-migration-id', status: 'running' } });

    await migrateArtistSpotlightFieldsOnce();

    expect(deploymentCreateMock).not.toHaveBeenCalled();
    expect(artistUpdateManyMock).not.toHaveBeenCalled();
  });
});
