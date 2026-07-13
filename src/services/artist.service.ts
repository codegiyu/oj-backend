/* Mongoose lean docs are typed loosely; match artist.controller eslint baseline. */

import mongoose from 'mongoose';
import type { IArtist } from '../lib/types/constants';
import { AppError } from '../utils/AppError';
import {
  slugify,
  generateUniqueSlug,
  parsePositiveInteger,
  parseSearch,
  parseString,
  normalizeSort,
} from '../utils/helpers';
import {
  ARTIST_POPULATE_SELECT,
  toArtistSummary,
  serializeDocIds,
  leanIdToString,
  type PopulatedArtistDoc,
} from '../controllers/artist/artist.helpers';
import { Artist } from '../models/artist';
import { buildArtistDashboardStats } from './artistDashboardStats.service';
import { assertMonetizationPrice, resolveMonetizationPrice } from '../utils/monetizationValidation';
import { coalesceMusicDownloadUrl } from '../utils/musicDownloadUrl';
import {
  assertOwnerUserNotSuspended,
  deactivateRoleProfile,
  reactivateRoleProfile,
  createRoleProfileAppeal,
  loadAppealSummariesForProfile,
  shapeRolePortalMeta,
} from './roleProfileLifecycle.service';
import { isArtistOrPastorRoleActive } from './profileVisibility';
import { parseObjectId } from '../controllers/admin/admin.helpers';
import { assertMediaMetadata } from '../utils/contentTaxonomyValidation';
import * as artistRepo from '../repositories/artist/artist.repository';
import { healArtistIdForUser } from './roleProfileLink.service';

const MUSIC_SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status'];
const VIDEO_SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status'];

export function shapeMusicListItem(raw: artistRepo.MusicWithArtistLean): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as PopulatedArtistDoc | null | undefined);

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    status: raw.status,
    description: raw.description,
    coverImage: raw.coverImage,
    audioUrl: raw.audioUrl,
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    downloads: raw.downloads ?? 0,
    category: raw.category,
    isMonetizable: Boolean(raw.isMonetizable),
    price: typeof raw.price === 'number' ? raw.price : Number(raw.price) || 0,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    ...(artist && { artist }),
  };
}

function shapeMusicDetail(doc: artistRepo.MusicWithArtistLean): Record<string, unknown> {
  return {
    _id: leanIdToString(doc._id),
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    lyrics: doc.lyrics,
    coverImage: doc.coverImage,
    audioUrl: doc.audioUrl,
    videoUrl: doc.videoUrl,
    category: doc.category,
    status: doc.status,
    isMonetizable: doc.isMonetizable,
    price: doc.price ?? 0,
    views: doc.views ?? 0,
    plays: doc.plays ?? 0,
    downloads: doc.downloads ?? 0,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    artist: toArtistSummary(doc.artist as PopulatedArtistDoc | null | undefined),
  };
}

export function shapeVideoListItem(raw: artistRepo.VideoWithArtistLean): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as PopulatedArtistDoc | null | undefined);

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    status: raw.status,
    description: raw.description,
    thumbnail: raw.thumbnail,
    videoUrl: raw.videoUrl,
    videoFileUrl: raw.videoFileUrl,
    embedUrl: raw.embedUrl,
    category: raw.category,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    metadata:
      raw.metadata != null && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata)
        ? raw.metadata
        : {},
    isMonetizable: Boolean(raw.isMonetizable),
    price: typeof raw.price === 'number' ? raw.price : Number(raw.price) || 0,
    views: raw.views ?? 0,
    plays: raw.plays ?? 0,
    downloads: raw.downloads ?? 0,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    ...(artist && { artist }),
  };
}

function shapeVideoDetail(doc: artistRepo.VideoWithArtistLean): Record<string, unknown> {
  return {
    _id: leanIdToString(doc._id),
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    thumbnail: doc.thumbnail,
    videoUrl: doc.videoUrl,
    category: doc.category,
    status: doc.status,
    isMonetizable: doc.isMonetizable,
    price: doc.price ?? 0,
    views: doc.views ?? 0,
    plays: doc.plays ?? 0,
    downloads: doc.downloads ?? 0,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    artist: toArtistSummary(doc.artist as PopulatedArtistDoc | null | undefined),
  };
}

async function getArtistForUser(userId: string): Promise<IArtist> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user id', 400);
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  let user = await artistRepo.findUserArtistId(userObjectId);
  let artistId = user?.artistId ?? null;

  if (!artistId) {
    artistId = await healArtistIdForUser(userObjectId);
    if (artistId) {
      user = await artistRepo.findUserArtistId(userObjectId);
      artistId = user?.artistId ?? artistId;
    }
  }

  if (!artistId) {
    throw new AppError('You do not have an associated artist profile', 403);
  }

  const artist = await artistRepo.findArtistLeanById(artistId);

  if (!artist) {
    throw new AppError('Artist profile not found', 404);
  }

  return artist;
}

async function getArtistForUserOperational(userId: string): Promise<IArtist> {
  await assertOwnerUserNotSuspended(userId);
  const artist = await getArtistForUser(userId);

  if (!isArtistOrPastorRoleActive(artist)) {
    const status = artist.profileStatus ?? (artist.isActive === false ? 'suspended' : 'active');
    const message =
      status === 'deactivated'
        ? 'Your artist profile is deactivated'
        : 'Your artist profile has been suspended';
    throw new AppError(message, 403);
  }

  return artist;
}

export async function loadArtistMe(userId: string): Promise<Record<string, unknown>> {
  const artist = await getArtistForUser(userId);
  const appeals = await loadAppealSummariesForProfile('artist', artist._id);
  const serialized = serializeDocIds(artist as unknown as Record<string, unknown>);
  const meta = shapeRolePortalMeta('artist', serialized, appeals);

  return { artist: serialized, ...meta };
}

export async function deactivateArtistProfile(userId: string): Promise<void> {
  const artist = await getArtistForUser(userId);

  await deactivateRoleProfile({
    profileType: 'artist',
    profileId: artist._id,
    userId: parseObjectId(userId, 'userId'),
  });
}

export async function reactivateArtistProfile(userId: string): Promise<void> {
  const artist = await getArtistForUser(userId);

  await reactivateRoleProfile({
    profileType: 'artist',
    profileId: artist._id,
    userId: parseObjectId(userId, 'userId'),
  });
}

export async function submitArtistProfileAppeal(
  userId: string,
  message: string
): Promise<Record<string, unknown>> {
  const artist = await getArtistForUser(userId);

  const appeal = await createRoleProfileAppeal({
    profileType: 'artist',
    profileId: artist._id,
    userId: parseObjectId(userId, 'userId'),
    message,
  });

  return { appeal };
}

export async function createArtistProfile(
  userId: string,
  body: {
    name: string;
    bio?: string;
    image?: string;
    coverImage?: string;
    genre?: string;
    socials?: Record<string, string>;
  }
): Promise<{ statusCode: number; data: Record<string, unknown>; message: string }> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid user id', 400);
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!name) {
    throw new AppError('Name is required', 400);
  }

  const user = await artistRepo.findUserArtistId(userObjectId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.artistId) {
    throw new AppError('You already have an artist profile', 409);
  }

  const linkedArtist = await artistRepo.findArtistByUserId(userObjectId);

  if (linkedArtist) {
    await artistRepo.linkUserArtistIdIfUnset(userObjectId, linkedArtist._id);
    const serialized = serializeDocIds(linkedArtist as unknown as Record<string, unknown>);

    return {
      statusCode: 200,
      data: { artist: serialized },
      message: 'Artist profile linked.',
    };
  }

  const slug = await generateUniqueSlug(Artist, name);

  const artistDoc = await artistRepo.createArtistRecord({
    user: userObjectId,
    name,
    slug,
    bio: body.bio ?? '',
    image: body.image ?? '',
    coverImage: body.coverImage ?? '',
    genre: body.genre ?? '',
    socials: body.socials ?? {},
    isFeatured: false,
    isActive: true,
    profileStatus: 'active',
    displayOrder: 0,
  });

  const linked = await artistRepo.linkUserArtistIdIfUnset(userObjectId, artistDoc._id);

  if (!linked) {
    await artistRepo.deleteArtistRecord(artistDoc._id);
    throw new AppError('You already have an artist profile', 409);
  }

  const serialized = serializeDocIds(artistDoc.toObject() as unknown as Record<string, unknown>);

  return {
    statusCode: 201,
    data: { artist: serialized },
    message: 'Artist profile created.',
  };
}

export async function updateArtistProfile(
  userId: string,
  body: {
    name?: string;
    bio?: string;
    image?: string;
    coverImage?: string;
    genre?: string;
    socials?: Record<string, string>;
  }
): Promise<Record<string, unknown>> {
  const artistLean = await getArtistForUserOperational(userId);
  const artistDoc = await artistRepo.findArtistDocumentById(artistLean._id);

  if (!artistDoc) {
    throw new AppError('Artist profile not found', 404);
  }

  if (body.name !== undefined) artistDoc.name = body.name;
  if (body.bio !== undefined) artistDoc.bio = body.bio;
  if (body.image !== undefined) artistDoc.image = body.image;
  if (body.coverImage !== undefined) artistDoc.coverImage = body.coverImage;
  if (body.genre !== undefined) artistDoc.genre = body.genre;
  if (body.socials !== undefined) artistDoc.socials = body.socials as typeof artistDoc.socials;

  await artistDoc.save();

  return { artist: serializeDocIds(artistDoc.toObject() as unknown as Record<string, unknown>) };
}

export async function loadArtistDashboardStats(userId: string): Promise<Record<string, unknown>> {
  const artist = await getArtistForUserOperational(userId);
  const stats = await buildArtistDashboardStats(artist._id, { includeTopLists: false });

  return {
    tracksCount: stats.tracksCount,
    videosCount: stats.videosCount,
    totalPlays: stats.totalPlays,
    totalViews: stats.totalViews,
    totalDownloads: stats.totalDownloads,
    music: stats.music,
    video: stats.video,
    devotionals: stats.devotionals,
    tracksAddedThisMonth: stats.tracksAddedThisMonth,
    playsDeltaPercent: stats.playsDeltaPercent,
  };
}

export async function loadArtistRecentUploads(
  userId: string,
  limitRaw?: string
): Promise<Record<string, unknown>> {
  const artist = await getArtistForUserOperational(userId);
  const limit = parsePositiveInteger(limitRaw, 6, 20);
  const { buildArtistRecentUploads } = await import('./artistRecentUploads.service');
  const uploads = await buildArtistRecentUploads(artist._id, limit);

  return { uploads };
}

export async function listArtistMusic(
  userId: string,
  query: { page?: string; limit?: string; status?: string; search?: string; sort?: string }
): Promise<Record<string, unknown>> {
  const artist = await getArtistForUserOperational(userId);
  const limit = parsePositiveInteger(query.limit, 10, 100);
  const page = parsePositiveInteger(query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(query.search);
  const status = parseString(query.status);
  const sortStr = normalizeSort(query.sort, MUSIC_SORT_FIELDS, '-createdAt');

  const filter: Record<string, unknown> = { artist: artist._id };

  if (status) filter.status = status;

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    artistRepo.listMusicForArtist({ filter, sort: sortStr, skip, limit }),
    artistRepo.countMusicForArtist(filter),
  ]);

  return {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    music: items.map(shapeMusicListItem),
  };
}

export async function loadArtistMusicItem(
  userId: string,
  musicId: string
): Promise<Record<string, unknown>> {
  const artist = await getArtistForUserOperational(userId);

  if (!mongoose.Types.ObjectId.isValid(musicId)) {
    throw new AppError('Invalid id', 400);
  }

  const doc = await artistRepo.findMusicForArtistById(
    new mongoose.Types.ObjectId(musicId),
    artist._id
  );

  if (!doc) {
    throw new AppError('Music not found', 404);
  }

  return { music: shapeMusicDetail(doc) };
}

export async function listArtistVideos(
  userId: string,
  query: { page?: string; limit?: string; status?: string; search?: string; sort?: string }
): Promise<Record<string, unknown>> {
  const artist = await getArtistForUserOperational(userId);
  const limit = parsePositiveInteger(query.limit, 10, 100);
  const page = parsePositiveInteger(query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(query.search);
  const status = parseString(query.status);
  const sortStr = normalizeSort(query.sort, VIDEO_SORT_FIELDS, '-createdAt');

  const filter: Record<string, unknown> = { artist: artist._id };

  if (status) filter.status = status;

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    artistRepo.listVideosForArtist({ filter, sort: sortStr, skip, limit }),
    artistRepo.countVideosForArtist(filter),
  ]);

  return {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    videos: items.map(shapeVideoListItem),
  };
}

export async function loadArtistVideoItem(
  userId: string,
  videoId: string
): Promise<Record<string, unknown>> {
  const artist = await getArtistForUserOperational(userId);

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new AppError('Invalid id', 400);
  }

  const doc = await artistRepo.findVideoForArtistById(
    new mongoose.Types.ObjectId(videoId),
    artist._id
  );

  if (!doc) {
    throw new AppError('Video not found', 404);
  }

  return { video: shapeVideoDetail(doc) };
}

async function resolveUniqueMusicSlug(
  artistId: mongoose.Types.ObjectId,
  title: string
): Promise<string> {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let n = 0;

  while (await artistRepo.findMusicByArtistSlug(artistId, slug)) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  return slug;
}

async function resolveUniqueVideoSlug(
  artistId: mongoose.Types.ObjectId,
  title: string
): Promise<string> {
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let n = 0;

  while (await artistRepo.findVideoByArtistSlug(artistId, slug)) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  return slug;
}

export async function createArtistMusic(
  userId: string,
  body: {
    title: string;
    description?: string;
    lyrics?: string;
    coverImage?: string;
    audioUrl?: string;
    videoUrl?: string;
    category?: string;
    isMonetizable?: boolean;
    price?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<Record<string, unknown>> {
  const artist = await getArtistForUserOperational(userId);
  const isMonetizable = body.isMonetizable ?? false;
  const metadata = assertMediaMetadata(body.metadata);

  assertMonetizationPrice(isMonetizable, body.price ?? 0);

  const slug = await resolveUniqueMusicSlug(artist._id, body.title);

  const music = await artistRepo.createMusicRecord({
    title: body.title,
    slug,
    artist: artist._id,
    description: body.description ?? '',
    lyrics: body.lyrics ?? '',
    coverImage: body.coverImage ?? '',
    audioUrl: body.audioUrl ?? '',
    videoUrl: body.videoUrl ?? '',
    downloadUrl: coalesceMusicDownloadUrl(body.audioUrl, undefined),
    category: body.category ?? '',
    metadata,
    status: 'draft',
    isMonetizable,
    price: resolveMonetizationPrice(isMonetizable, body.price ?? 0),
    isFeatured: false,
    displayOrder: 0,
    views: 0,
    plays: 0,
    downloads: 0,
  });

  const populated = await artistRepo.findMusicPopulatedById(music._id);

  if (!populated) {
    return { music: shapeMusicListItem(music as artistRepo.MusicWithArtistLean) };
  }

  return { music: shapeMusicDetail(populated) };
}

export async function updateArtistMusic(
  userId: string,
  musicId: string,
  body: {
    title?: string;
    description?: string;
    lyrics?: string;
    coverImage?: string;
    audioUrl?: string;
    videoUrl?: string;
    category?: string;
    status?: string;
    isMonetizable?: boolean;
    price?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<Record<string, unknown>> {
  const artist = await getArtistForUserOperational(userId);

  if (!mongoose.Types.ObjectId.isValid(musicId)) {
    throw new AppError('Invalid id', 400);
  }

  const music = await artistRepo.findMusicDocumentForArtist(
    new mongoose.Types.ObjectId(musicId),
    artist._id
  );

  if (!music) {
    throw new AppError('Music not found', 404);
  }

  const nextMonetizable = body.isMonetizable ?? music.isMonetizable ?? false;
  const nextPrice =
    body.price !== undefined
      ? body.price
      : body.isMonetizable !== undefined
        ? music.price
        : undefined;

  assertMonetizationPrice(nextMonetizable, nextPrice ?? music.price ?? 0);

  if (body.title !== undefined) music.title = body.title;
  if (body.description !== undefined) music.description = body.description;
  if (body.lyrics !== undefined) music.lyrics = body.lyrics;
  if (body.coverImage !== undefined) music.coverImage = body.coverImage;

  if (body.audioUrl !== undefined) {
    music.audioUrl = body.audioUrl;
    music.downloadUrl = coalesceMusicDownloadUrl(body.audioUrl, music.downloadUrl);
  }

  if (body.videoUrl !== undefined) music.videoUrl = body.videoUrl;
  if (body.category !== undefined) music.category = body.category;
  if (body.metadata !== undefined) music.metadata = assertMediaMetadata(body.metadata);
  if (body.status !== undefined) music.status = body.status as 'draft' | 'published' | 'archived';
  if (body.isMonetizable !== undefined) music.isMonetizable = body.isMonetizable;

  if (body.price !== undefined || body.isMonetizable !== undefined) {
    music.price = resolveMonetizationPrice(nextMonetizable, nextPrice ?? music.price, music.price);
  }

  await music.save();

  const populated = await artistRepo.findMusicPopulatedById(music._id);

  if (!populated) {
    return { music: shapeMusicListItem(music.toObject() as artistRepo.MusicWithArtistLean) };
  }

  return { music: shapeMusicDetail(populated) };
}

export async function archiveArtistMusic(userId: string, musicId: string): Promise<void> {
  const artist = await getArtistForUserOperational(userId);

  if (!mongoose.Types.ObjectId.isValid(musicId)) {
    throw new AppError('Invalid id', 400);
  }

  const result = await artistRepo.archiveMusicForArtist(
    new mongoose.Types.ObjectId(musicId),
    artist._id
  );

  if (!result) {
    throw new AppError('Music not found', 404);
  }
}

export async function createArtistVideo(
  userId: string,
  body: {
    title: string;
    description?: string;
    thumbnail?: string;
    videoUrl?: string;
    videoFileUrl?: string;
    embedUrl?: string;
    category?: string;
    isMonetizable?: boolean;
    price?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<Record<string, unknown>> {
  const artist = await getArtistForUserOperational(userId);
  const isMonetizable = body.isMonetizable ?? false;
  const metadata = assertMediaMetadata(body.metadata);

  assertMonetizationPrice(isMonetizable, body.price ?? 0);

  const slug = await resolveUniqueVideoSlug(artist._id, body.title);

  const video = await artistRepo.createVideoRecord({
    title: body.title,
    slug,
    artist: artist._id,
    description: body.description ?? '',
    thumbnail: body.thumbnail ?? '',
    videoUrl: body.videoUrl ?? '',
    videoFileUrl: body.videoFileUrl ?? '',
    embedUrl: body.embedUrl ?? '',
    category: body.category ?? '',
    metadata,
    status: 'draft',
    isMonetizable,
    price: resolveMonetizationPrice(isMonetizable, body.price ?? 0),
    isFeatured: false,
    displayOrder: 0,
    views: 0,
    plays: 0,
    downloads: 0,
  });

  const populated = await artistRepo.findVideoPopulatedById(video._id);

  if (!populated) {
    return { video: shapeVideoListItem(video as artistRepo.VideoWithArtistLean) };
  }

  return { video: shapeVideoDetail(populated) };
}

export async function updateArtistVideo(
  userId: string,
  videoId: string,
  body: {
    title?: string;
    description?: string;
    thumbnail?: string;
    videoUrl?: string;
    videoFileUrl?: string;
    embedUrl?: string;
    category?: string;
    status?: string;
    isMonetizable?: boolean;
    price?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<Record<string, unknown>> {
  const artist = await getArtistForUserOperational(userId);

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new AppError('Invalid id', 400);
  }

  const video = await artistRepo.findVideoDocumentForArtist(
    new mongoose.Types.ObjectId(videoId),
    artist._id
  );

  if (!video) {
    throw new AppError('Video not found', 404);
  }

  const nextMonetizable = body.isMonetizable ?? video.isMonetizable ?? false;
  const nextPrice =
    body.price !== undefined
      ? body.price
      : body.isMonetizable !== undefined
        ? video.price
        : undefined;

  assertMonetizationPrice(nextMonetizable, nextPrice ?? video.price ?? 0);

  if (body.title !== undefined) video.title = body.title;
  if (body.description !== undefined) video.description = body.description;
  if (body.thumbnail !== undefined) video.thumbnail = body.thumbnail;
  if (body.videoUrl !== undefined) video.videoUrl = body.videoUrl;
  if (body.videoFileUrl !== undefined) video.videoFileUrl = body.videoFileUrl;
  if (body.embedUrl !== undefined) video.embedUrl = body.embedUrl;
  if (body.category !== undefined) video.category = body.category;
  if (body.metadata !== undefined) video.metadata = assertMediaMetadata(body.metadata);
  if (body.status !== undefined) video.status = body.status as 'draft' | 'published' | 'archived';
  if (body.isMonetizable !== undefined) video.isMonetizable = body.isMonetizable;

  if (body.price !== undefined || body.isMonetizable !== undefined) {
    video.price = resolveMonetizationPrice(nextMonetizable, nextPrice ?? video.price, video.price);
  }

  await video.save();

  const populated = await artistRepo.findVideoPopulatedById(video._id);

  if (!populated) {
    return { video: shapeVideoListItem(video.toObject() as artistRepo.VideoWithArtistLean) };
  }

  return { video: shapeVideoDetail(populated) };
}

export async function archiveArtistVideo(userId: string, videoId: string): Promise<void> {
  const artist = await getArtistForUserOperational(userId);

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new AppError('Invalid id', 400);
  }

  const result = await artistRepo.archiveVideoForArtist(
    new mongoose.Types.ObjectId(videoId),
    artist._id
  );

  if (!result) {
    throw new AppError('Video not found', 404);
  }
}

/** Re-export for tests and legacy imports. */
export { ARTIST_POPULATE_SELECT };
