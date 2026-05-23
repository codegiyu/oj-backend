import mongoose from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/utils/AppError';

const {
  musicFindOne,
  videoFindOne,
  newsFindOne,
  devotionalFindOne,
  musicFind,
  videoFind,
  newsFind,
  devotionalFind,
  favoriteFind,
  favoriteCountDocuments,
  favoriteFindOneAndUpdate,
  favoriteDeleteOne,
} = vi.hoisted(() => ({
  musicFindOne: vi.fn(),
  videoFindOne: vi.fn(),
  newsFindOne: vi.fn(),
  devotionalFindOne: vi.fn(),
  musicFind: vi.fn(),
  videoFind: vi.fn(),
  newsFind: vi.fn(),
  devotionalFind: vi.fn(),
  favoriteFind: vi.fn(),
  favoriteCountDocuments: vi.fn(),
  favoriteFindOneAndUpdate: vi.fn(),
  favoriteDeleteOne: vi.fn(),
}));

vi.mock('../../src/models/contentFavorite', () => ({
  ContentFavorite: {
    find: favoriteFind,
    countDocuments: favoriteCountDocuments,
    findOneAndUpdate: favoriteFindOneAndUpdate,
    deleteOne: favoriteDeleteOne,
  },
}));

vi.mock('../../src/models/music', () => ({
  Music: {
    findOne: musicFindOne,
    find: musicFind,
  },
}));

vi.mock('../../src/models/video', () => ({
  Video: {
    findOne: videoFindOne,
    find: videoFind,
  },
}));

vi.mock('../../src/models/newsArticle', () => ({
  NewsArticle: {
    findOne: newsFindOne,
    find: newsFind,
  },
}));

vi.mock('../../src/models/devotional', () => ({
  Devotional: {
    findOne: devotionalFindOne,
    find: devotionalFind,
  },
}));

import {
  addContentFavorite,
  assertPublishedContentExists,
  listContentFavoriteKeys,
  listContentFavorites,
  removeContentFavorite,
} from '../../src/services/contentFavorite.service';

const userId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439099');
const musicId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');

function chainLean<T>(value: T) {
  return {
    populate: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(value),
  };
}

describe('contentFavorite.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('assertPublishedContentExists', () => {
    it('throws 404 when published music is missing', async () => {
      musicFindOne.mockReturnValue(chainLean(null));

      await expect(assertPublishedContentExists('music', musicId)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Music not found',
      });
    });

    it('returns lean music when published', async () => {
      const doc = {
        _id: musicId,
        title: 'Track',
        slug: 'track',
        coverImage: 'https://cdn/cover.jpg',
        artist: { name: 'Artist' },
      };
      musicFindOne.mockReturnValue(chainLean(doc));

      const result = await assertPublishedContentExists('music', musicId);

      expect(result.title).toBe('Track');
    });
  });

  describe('listContentFavorites', () => {
    it('rejects invalid entityType filter', async () => {
      await expect(
        listContentFavorites({
          userId,
          page: 1,
          limit: 20,
          entityType: 'product',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid entityType filter',
      });
    });

    it('shapes listed favorites and skips unpublished entities', async () => {
      const createdAt = new Date('2026-05-20T10:00:00.000Z');
      favoriteFind.mockReturnValue(
        chainLean([
          {
            _id: 'fav1',
            entityType: 'music',
            entityId: musicId,
            createdAt,
          },
          {
            _id: 'fav2',
            entityType: 'music',
            entityId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
            createdAt,
          },
        ])
      );
      favoriteCountDocuments.mockResolvedValue(2);
      musicFind.mockReturnValue(
        chainLean([
          {
            _id: musicId,
            title: 'Saved Track',
            slug: 'saved-track',
            coverImage: 'https://cdn/cover.jpg',
            artist: { name: 'Artist' },
          },
        ])
      );

      const result = await listContentFavorites({ userId, page: 1, limit: 20 });

      expect(result.total).toBe(2);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        entityType: 'music',
        entityId: musicId.toHexString(),
        title: 'Saved Track',
        subtitle: 'Artist',
        href: '/music/saved-track',
        createdAt: createdAt.toISOString(),
      });
    });
  });

  describe('addContentFavorite', () => {
    it('rejects invalid entity type', async () => {
      await expect(
        addContentFavorite({
          userId,
          entityType: 'podcast',
          entityId: musicId.toHexString(),
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid entity type',
      });
    });

    it('rejects invalid entityId', async () => {
      await expect(
        addContentFavorite({
          userId,
          entityType: 'music',
          entityId: 'not-an-object-id',
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid entityId',
      });
    });

    it('upserts favorite and returns shaped item', async () => {
      const entity = {
        _id: musicId,
        title: 'Track',
        slug: 'track',
        coverImage: 'https://cdn/cover.jpg',
        artist: { name: 'Artist' },
      };
      musicFindOne.mockReturnValue(chainLean(entity));
      favoriteFindOneAndUpdate.mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: 'fav1',
          entityType: 'music',
          entityId: musicId,
          createdAt: '2026-05-20T10:00:00.000Z',
        }),
      });

      const item = await addContentFavorite({
        userId,
        entityType: 'music',
        entityId: musicId.toHexString(),
      });

      expect(item).toMatchObject({
        entityType: 'music',
        entityId: musicId.toHexString(),
        title: 'Track',
        href: '/music/track',
      });
      expect(favoriteFindOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('removeContentFavorite', () => {
    it('deletes by user, type, and entity id', async () => {
      favoriteDeleteOne.mockResolvedValue({ deletedCount: 1 });

      await removeContentFavorite({
        userId,
        entityType: 'music',
        entityId: musicId.toHexString(),
      });

      expect(favoriteDeleteOne).toHaveBeenCalledWith({
        user: userId,
        entityType: 'music',
        entityId: musicId,
      });
    });

    it('throws for invalid entity type', async () => {
      await expect(
        removeContentFavorite({
          userId,
          entityType: 'invalid',
          entityId: musicId.toHexString(),
        })
      ).rejects.toBeInstanceOf(AppError);
    });
  });

  describe('listContentFavoriteKeys', () => {
    it('returns type:id keys', async () => {
      favoriteFind.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { entityType: 'video', entityId: musicId },
            { entityType: 'music', entityId: musicId },
          ]),
        }),
      });

      const keys = await listContentFavoriteKeys(userId);

      expect(keys).toEqual([`video:${musicId.toHexString()}`, `music:${musicId.toHexString()}`]);
    });
  });
});
