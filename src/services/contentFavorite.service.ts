import mongoose from 'mongoose';
import { ContentFavorite } from '../models/contentFavorite';
import { Music } from '../models/music';
import { Video } from '../models/video';
import { NewsArticle } from '../models/newsArticle';
import { Devotional } from '../models/devotional';
import { AppError } from '../utils/AppError';
import { leanIdToString } from '../utils/leanId';
import {
  buildContentFavoriteHref,
  type ContentFavoriteEntityType,
  isContentFavoriteEntityType,
} from './contentFavorite.helpers';

type LeanDoc = Record<string, unknown>;

type FavoriteLean = {
  _id: unknown;
  entityType: ContentFavoriteEntityType;
  entityId: unknown;
  createdAt?: unknown;
};

function toLeanDoc(doc: unknown): LeanDoc {
  return doc as LeanDoc;
}

function favoriteCreatedAtIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    return value;
  }

  return '';
}

export interface ContentFavoriteItemShape {
  _id: string;
  entityType: ContentFavoriteEntityType;
  entityId: string;
  createdAt: string;
  title: string;
  slug?: string;
  image?: string;
  subtitle?: string;
  href: string;
}

export async function assertPublishedContentExists(
  entityType: ContentFavoriteEntityType,
  entityId: mongoose.Types.ObjectId
): Promise<LeanDoc> {
  switch (entityType) {
    case 'music': {
      const doc = await Music.findOne({ _id: entityId, status: 'published' })
        .populate('artist', 'name')
        .lean();
      if (!doc) throw new AppError('Music not found', 404);
      return toLeanDoc(doc);
    }
    case 'video': {
      const doc = await Video.findOne({ _id: entityId, status: 'published' })
        .populate('artist', 'name')
        .lean();
      if (!doc) throw new AppError('Video not found', 404);
      return toLeanDoc(doc);
    }
    case 'news': {
      const doc = await NewsArticle.findOne({ _id: entityId, status: 'published' }).lean();
      if (!doc) throw new AppError('News article not found', 404);
      return toLeanDoc(doc);
    }
    case 'devotional': {
      const doc = await Devotional.findOne({ _id: entityId, status: 'published' }).lean();
      if (!doc) throw new AppError('Devotional not found', 404);
      return toLeanDoc(doc);
    }
    default:
      throw new AppError('Invalid entity type', 400);
  }
}

function shapeFavoriteItem(favorite: FavoriteLean, entity: LeanDoc): ContentFavoriteItemShape {
  const entityId = leanIdToString(entityIdFromDoc(entity));
  const slug = typeof entity.slug === 'string' ? entity.slug : undefined;
  const title = typeof entity.title === 'string' ? entity.title : 'Untitled';

  let image: string | undefined;
  let subtitle: string | undefined;

  if (favorite.entityType === 'music') {
    image = typeof entity.coverImage === 'string' ? entity.coverImage : undefined;
    subtitle = artistNameFromEntity(entity);
  } else if (favorite.entityType === 'video') {
    image = typeof entity.thumbnail === 'string' ? entity.thumbnail : undefined;
    subtitle = artistNameFromEntity(entity);
  } else if (favorite.entityType === 'news') {
    image = typeof entity.coverImage === 'string' ? entity.coverImage : undefined;
    subtitle = typeof entity.author === 'string' ? entity.author : undefined;
  } else {
    image = typeof entity.coverImage === 'string' ? entity.coverImage : undefined;
    subtitle = typeof entity.author === 'string' ? entity.author : undefined;
  }

  return {
    _id: leanIdToString(favorite._id),
    entityType: favorite.entityType,
    entityId,
    createdAt: favoriteCreatedAtIso(favorite.createdAt),
    title,
    slug,
    image,
    subtitle,
    href: buildContentFavoriteHref(favorite.entityType, entityId, slug),
  };
}

function entityIdFromDoc(entity: LeanDoc): unknown {
  return entity._id;
}

function artistNameFromEntity(entity: LeanDoc): string | undefined {
  const artist = entity.artist;
  if (!artist || typeof artist !== 'object') return undefined;
  const name = (artist as LeanDoc).name;
  return typeof name === 'string' ? name : undefined;
}

function toFavoriteLean(fav: {
  _id: unknown;
  entityType: string;
  entityId: unknown;
  createdAt?: unknown;
}): FavoriteLean {
  if (!isContentFavoriteEntityType(fav.entityType)) {
    throw new AppError('Invalid entity type on favorite record', 500);
  }

  return {
    _id: fav._id,
    entityType: fav.entityType,
    entityId: fav.entityId,
    createdAt: fav.createdAt,
  };
}

async function loadPublishedEntitiesByType(
  entityType: ContentFavoriteEntityType,
  ids: mongoose.Types.ObjectId[]
): Promise<Map<string, LeanDoc>> {
  const map = new Map<string, LeanDoc>();
  if (ids.length === 0) return map;

  switch (entityType) {
    case 'music': {
      const docs = await Music.find({ _id: { $in: ids }, status: 'published' })
        .populate('artist', 'name')
        .lean();
      for (const doc of docs) {
        const lean = toLeanDoc(doc);
        map.set(leanIdToString(lean._id), lean);
      }
      break;
    }
    case 'video': {
      const docs = await Video.find({ _id: { $in: ids }, status: 'published' })
        .populate('artist', 'name')
        .lean();
      for (const doc of docs) {
        const lean = toLeanDoc(doc);
        map.set(leanIdToString(lean._id), lean);
      }
      break;
    }
    case 'news': {
      const docs = await NewsArticle.find({ _id: { $in: ids }, status: 'published' }).lean();
      for (const doc of docs) {
        const lean = toLeanDoc(doc);
        map.set(leanIdToString(lean._id), lean);
      }
      break;
    }
    case 'devotional': {
      const docs = await Devotional.find({ _id: { $in: ids }, status: 'published' }).lean();
      for (const doc of docs) {
        const lean = toLeanDoc(doc);
        map.set(leanIdToString(lean._id), lean);
      }
      break;
    }
    default:
      break;
  }

  return map;
}

export async function listContentFavorites(params: {
  userId: mongoose.Types.ObjectId;
  page: number;
  limit: number;
  entityType?: string;
}): Promise<{ items: ContentFavoriteItemShape[]; total: number }> {
  const filter: Record<string, unknown> = { user: params.userId };

  if (params.entityType) {
    if (!isContentFavoriteEntityType(params.entityType)) {
      throw new AppError('Invalid entityType filter', 400);
    }
    filter.entityType = params.entityType;
  }

  const skip = (params.page - 1) * params.limit;

  const [favorites, total] = await Promise.all([
    ContentFavorite.find(filter).sort({ createdAt: -1 }).skip(skip).limit(params.limit).lean(),
    ContentFavorite.countDocuments(filter),
  ]);

  const grouped = new Map<ContentFavoriteEntityType, mongoose.Types.ObjectId[]>();
  for (const fav of favorites) {
    const favoriteLean = toFavoriteLean(fav);
    const list = grouped.get(favoriteLean.entityType) ?? [];
    list.push(new mongoose.Types.ObjectId(leanIdToString(favoriteLean.entityId)));
    grouped.set(favoriteLean.entityType, list);
  }

  const entityMaps = new Map<ContentFavoriteEntityType, Map<string, LeanDoc>>();
  for (const [type, ids] of grouped) {
    entityMaps.set(type, await loadPublishedEntitiesByType(type, ids));
  }

  const items: ContentFavoriteItemShape[] = [];

  for (const fav of favorites) {
    const favoriteLean = toFavoriteLean(fav);
    const entityId = leanIdToString(favoriteLean.entityId);
    const entity = entityMaps.get(favoriteLean.entityType)?.get(entityId);
    if (!entity) continue;

    items.push(shapeFavoriteItem(favoriteLean, entity));
  }

  return { items, total };
}

export async function addContentFavorite(params: {
  userId: mongoose.Types.ObjectId;
  entityType: string;
  entityId: string;
}): Promise<ContentFavoriteItemShape> {
  if (!isContentFavoriteEntityType(params.entityType)) {
    throw new AppError('Invalid entity type', 400);
  }

  if (!mongoose.Types.ObjectId.isValid(params.entityId)) {
    throw new AppError('Invalid entityId', 400);
  }

  const entityObjectId = new mongoose.Types.ObjectId(params.entityId);
  const entity = await assertPublishedContentExists(params.entityType, entityObjectId);

  const favorite = await ContentFavorite.findOneAndUpdate(
    {
      user: params.userId,
      entityType: params.entityType,
      entityId: entityObjectId,
    },
    {
      $setOnInsert: {
        user: params.userId,
        entityType: params.entityType,
        entityId: entityObjectId,
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).lean();

  if (!favorite) throw new AppError('Failed to add favorite', 500);

  return shapeFavoriteItem(toFavoriteLean(favorite), entity);
}

export async function removeContentFavorite(params: {
  userId: mongoose.Types.ObjectId;
  entityType: string;
  entityId: string;
}): Promise<void> {
  if (!isContentFavoriteEntityType(params.entityType)) {
    throw new AppError('Invalid entity type', 400);
  }

  if (!mongoose.Types.ObjectId.isValid(params.entityId)) {
    throw new AppError('Invalid entityId', 400);
  }

  await ContentFavorite.deleteOne({
    user: params.userId,
    entityType: params.entityType,
    entityId: new mongoose.Types.ObjectId(params.entityId),
  });
}

export async function listContentFavoriteKeys(userId: mongoose.Types.ObjectId): Promise<string[]> {
  const favorites = await ContentFavorite.find({ user: userId })
    .select('entityType entityId')
    .lean();

  return favorites.map(fav => {
    const favoriteLean = toFavoriteLean(fav);
    return `${favoriteLean.entityType}:${leanIdToString(favoriteLean.entityId)}`;
  });
}
