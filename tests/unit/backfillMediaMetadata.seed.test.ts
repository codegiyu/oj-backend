import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  addJobToQueueMock,
  musicFindMock,
  videoFindMock,
  deploymentFindOneMock,
  deploymentCreateMock,
  deploymentFindByIdAndUpdateMock,
} = vi.hoisted(() => ({
  addJobToQueueMock: vi.fn(),
  musicFindMock: vi.fn(),
  videoFindMock: vi.fn(),
  deploymentFindOneMock: vi.fn(),
  deploymentCreateMock: vi.fn(),
  deploymentFindByIdAndUpdateMock: vi.fn(),
}));

vi.mock('../../src/queues/main.queue', () => ({
  addJobToQueue: addJobToQueueMock,
}));

vi.mock('../../src/models/music', () => ({
  Music: {
    find: musicFindMock,
  },
}));

vi.mock('../../src/models/video', () => ({
  Video: {
    find: videoFindMock,
  },
}));

vi.mock('../../src/models/deploymentMigration', () => ({
  DeploymentMigration: {
    findOne: deploymentFindOneMock,
    create: deploymentCreateMock,
    findByIdAndUpdate: deploymentFindByIdAndUpdateMock,
  },
}));

import { backfillMediaMetadataOnce } from '../../src/seed/backfillMediaMetadata';

function mockEntityFind<T>(items: T[]) {
  function* iterateItems(): Generator<T> {
    for (const item of items) {
      yield item;
    }
  }

  return {
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockReturnValue({
        cursor: vi.fn().mockReturnValue(iterateItems()),
      }),
    }),
  };
}

describe('backfillMediaMetadataOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addJobToQueueMock.mockResolvedValue('job-1');
    deploymentFindOneMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });
    deploymentCreateMock.mockResolvedValue({
      _id: 'migration-1',
    });
    deploymentFindByIdAndUpdateMock.mockResolvedValue(null);
  });

  it('skips when migration already completed', async () => {
    deploymentFindOneMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'done',
        status: 'completed',
      }),
    });

    await backfillMediaMetadataOnce();

    expect(musicFindMock).not.toHaveBeenCalled();
    expect(deploymentCreateMock).not.toHaveBeenCalled();
  });

  it('enqueues jobs for music and video missing metadata', async () => {
    musicFindMock.mockReturnValue(
      mockEntityFind([
        {
          _id: 'music-1',
          audioUrl: 'https://cdn.example/a.mp3',
          videoUrl: '',
          metadata: {},
        },
      ])
    );

    videoFindMock.mockReturnValue(
      mockEntityFind([
        {
          _id: 'video-1',
          videoFileUrl: 'https://cdn.example/v.mp4',
          videoUrl: '',
          metadata: {},
        },
      ])
    );

    await backfillMediaMetadataOnce();

    expect(addJobToQueueMock).toHaveBeenCalledTimes(2);
    expect(deploymentFindByIdAndUpdateMock).toHaveBeenCalledOnce();

    type MigrationUpdateCall = [
      string,
      {
        $set: {
          status: string;
          stats: { musicEnqueued: number; videoEnqueued: number };
        };
      },
    ];

    const updateCall = deploymentFindByIdAndUpdateMock.mock.calls[0] as
      | MigrationUpdateCall
      | undefined;

    expect(updateCall?.[0]).toBe('migration-1');
    expect(updateCall?.[1]).toMatchObject({
      $set: {
        status: 'completed',
        stats: {
          musicEnqueued: 1,
          videoEnqueued: 1,
        },
      },
    });
  });
});
