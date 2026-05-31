import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  userFindByIdMock,
  pastorFindByIdMock,
  questionFindOneMock,
  questionFindByIdMock,
} = vi.hoisted(() => ({
  userFindByIdMock: vi.fn(),
  pastorFindByIdMock: vi.fn(),
  questionFindOneMock: vi.fn(),
  questionFindByIdMock: vi.fn(),
}));

vi.mock('../../src/models/user', () => ({
  User: {
    findById: userFindByIdMock,
  },
}));

vi.mock('../../src/models/pastor', () => ({
  Pastor: {
    findById: pastorFindByIdMock,
    updateOne: vi.fn(),
  },
}));

vi.mock('../../src/models/askPastorQuestion', () => ({
  AskPastorQuestion: {
    findOne: questionFindOneMock,
    findById: questionFindByIdMock,
  },
}));

vi.mock('../../src/utils/getAuthUser', () => ({
  getAuthUser: vi.fn(() => ({ userId: 'user-1', scope: 'client-access', email: 'p@test.com', jti: 'j' })),
}));

vi.mock('../../src/utils/response', () => ({
  sendResponse: vi.fn(),
}));

import { answerPastorQuestion, getPastorForUser } from '../../src/controllers/pastor/pastor.controller';
import { AppError } from '../../src/utils/AppError';

describe('pastor answer permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getPastorForUser throws 403 when user has no pastor link', async () => {
    userFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ pastorId: null }),
      }),
    });

    await expect(getPastorForUser('user-1')).rejects.toMatchObject({
      message: 'You do not have an associated pastor profile',
      statusCode: 403,
    });
  });

  it('getPastorForUser returns pastor when linked', async () => {
    userFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ pastorId: 'pastor-1' }),
      }),
    });
    pastorFindByIdMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'pastor-1', name: 'Rev. A' }),
    });

    const pastor = await getPastorForUser('user-1');
    expect(pastor.name).toBe('Rev. A');
  });

  it('answerPastorQuestion rejects private questions assigned to another pastor', async () => {
    userFindByIdMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ pastorId: 'pastor-1' }),
      }),
    });
    pastorFindByIdMock.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'pastor-1', name: 'Rev. A' }),
    });

    questionFindOneMock.mockResolvedValue({
      _id: 'q-1',
      isPrivate: true,
      requestedPastor: 'pastor-2',
      status: 'active',
      answers: [],
      save: vi.fn(),
    });

    const request = {
      params: { id: '507f1f77bcf86cd799439011' },
      body: { answer: 'Grace and peace.' },
    } as never;
    const reply = {} as never;

    await expect(answerPastorQuestion(request, reply)).rejects.toBeInstanceOf(AppError);
    await expect(answerPastorQuestion(request, reply)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
