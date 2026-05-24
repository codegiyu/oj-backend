import { beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';
import { MOCK_ALBUM_IDS } from '../helpers/albumMusicFixtures';

const { findByIdOrSlugMock, albumUpdateOneMock, dedupeCreateMock } = vi.hoisted(() => ({
  findByIdOrSlugMock: vi.fn(),
  albumUpdateOneMock: vi.fn().mockResolvedValue({ acknowledged: true }),
  dedupeCreateMock: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../src/controllers/public/community.helpers', () => ({
  findByIdOrSlug: findByIdOrSlugMock,
}));

vi.mock('../../src/models/album', () => ({
  Album: { updateOne: albumUpdateOneMock },
}));

vi.mock('../../src/models/contentAnalyticsDedupe', () => ({
  ContentAnalyticsDedupe: { create: dedupeCreateMock },
}));

vi.mock('../../src/models/music', () => ({ Music: { updateOne: vi.fn() } }));
vi.mock('../../src/models/video', () => ({ Video: { updateOne: vi.fn() } }));
vi.mock('../../src/models/devotional', () => ({ Devotional: { updateOne: vi.fn() } }));
vi.mock('../../src/models/newsArticle', () => ({ NewsArticle: { updateOne: vi.fn() } }));

vi.mock('../../src/utils/response', () => ({
  sendResponse: vi.fn(),
}));

describe('contentAnalytics.controller album events', () => {
  beforeEach(() => {
    findByIdOrSlugMock.mockReset();
    albumUpdateOneMock.mockClear();
    dedupeCreateMock.mockClear();
  });

  it('increments album views for published album view events', async () => {
    findByIdOrSlugMock.mockResolvedValueOnce({ _id: MOCK_ALBUM_IDS.primary });

    const { postPublicContentAnalyticsEvent } =
      await import('../../src/controllers/public/contentAnalytics.controller');

    const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };
    const request = {
      body: {
        entityType: 'album' as const,
        entityIdOrSlug: 'greatest-hits',
        event: 'view' as const,
        clientSessionId: 'session-1',
      },
      headers: {},
    };

    await postPublicContentAnalyticsEvent(request as never, reply as never);

    expect(findByIdOrSlugMock).toHaveBeenCalledWith(expect.anything(), 'greatest-hits', {
      status: 'published',
    });
    expect(albumUpdateOneMock).toHaveBeenCalledWith(
      { _id: new mongoose.Types.ObjectId(MOCK_ALBUM_IDS.primary) },
      { $inc: { views: 1 } }
    );
  });
});
