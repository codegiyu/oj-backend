import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  pastorDeleteManyMock,
  questionDeleteManyMock,
  deploymentFindOneMock,
  deploymentCreateMock,
  deploymentFindByIdAndUpdateMock,
} = vi.hoisted(() => ({
  pastorDeleteManyMock: vi.fn(),
  questionDeleteManyMock: vi.fn(),
  deploymentFindOneMock: vi.fn(),
  deploymentCreateMock: vi.fn(),
  deploymentFindByIdAndUpdateMock: vi.fn(),
}));

vi.mock('../../src/models/pastor', () => ({
  Pastor: {
    deleteMany: pastorDeleteManyMock,
  },
}));

vi.mock('../../src/models/askPastorQuestion', () => ({
  AskPastorQuestion: {
    deleteMany: questionDeleteManyMock,
  },
}));

vi.mock('../../src/models/deploymentMigration', () => ({
  DeploymentMigration: {
    findOne: deploymentFindOneMock,
    create: deploymentCreateMock,
    findByIdAndUpdate: deploymentFindByIdAndUpdateMock,
  },
}));

import { wipePastorAskDataOnce } from '../../src/seed/wipePastorAskData';

describe('wipePastorAskDataOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deploymentFindOneMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });
    deploymentCreateMock.mockResolvedValue({ _id: 'migration-1' });
    deploymentFindByIdAndUpdateMock.mockResolvedValue(null);
    pastorDeleteManyMock.mockResolvedValue({ deletedCount: 3 });
    questionDeleteManyMock.mockResolvedValue({ deletedCount: 12 });
  });

  it('skips when migration already completed', async () => {
    deploymentFindOneMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'done', status: 'completed' }),
    });

    await wipePastorAskDataOnce();

    expect(pastorDeleteManyMock).not.toHaveBeenCalled();
    expect(deploymentCreateMock).not.toHaveBeenCalled();
  });

  it('deletes pastors and questions then marks migration completed', async () => {
    await wipePastorAskDataOnce();

    expect(pastorDeleteManyMock).toHaveBeenCalledWith({});
    expect(questionDeleteManyMock).toHaveBeenCalledWith({});
    expect(deploymentFindByIdAndUpdateMock).toHaveBeenCalledWith(
      'migration-1',
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'completed',
          stats: { pastorsDeleted: 3, questionsDeleted: 12 },
        }),
      })
    );
  });
});
