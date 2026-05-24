import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findMock, sortMock, limitMock, leanMock } = vi.hoisted(() => {
  const sortMock = vi.fn();
  const limitMock = vi.fn();
  const leanMock = vi.fn();
  const findMock = vi.fn(() => ({
    sort: sortMock,
  }));

  return { findMock, sortMock, limitMock, leanMock };
});

vi.mock('../../src/models/homeAdvert', () => ({
  HomeAdvert: {
    find: findMock,
  },
}));

import {
  PUBLIC_HOME_ADVERT_SORT,
  listActiveHomeAdverts,
} from '../../src/repositories/homeAdvert.repository';

describe('homeAdvert.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sortMock.mockReturnValue({ limit: limitMock });
    limitMock.mockReturnValue({ lean: leanMock });
    leanMock.mockResolvedValue([]);
  });

  it('queries active adverts with image and sorts by slot, displayOrder, createdAt', async () => {
    await listActiveHomeAdverts(10);

    expect(findMock).toHaveBeenCalledWith({
      isActive: true,
      imageUrl: { $exists: true, $nin: ['', null] },
    });
    expect(sortMock).toHaveBeenCalledWith(PUBLIC_HOME_ADVERT_SORT);
    expect(limitMock).toHaveBeenCalledWith(10);
  });

  it('PUBLIC_HOME_ADVERT_SORT orders slot, displayOrder, then createdAt ascending', () => {
    expect(PUBLIC_HOME_ADVERT_SORT).toEqual({ slot: 1, displayOrder: 1, createdAt: 1 });
  });
});
