/* Mongoose model query helpers are typed loosely; strict ESLint sees `any` on assignments/member access. */
import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose, { type HydratedDocument } from 'mongoose';
import { Artist } from '../../models/artist';
import { Music } from '../../models/music';
import { Video } from '../../models/video';
import { User } from '../../models/user';
import type { IArtist, IMusic, IVideo, IUser, ModelArtist } from '../../lib/types/constants';
import { AppError } from '../../utils/AppError';
import { getAuthUser } from '../../utils/getAuthUser';
import { sendResponse } from '../../utils/response';
import {
  slugify,
  generateUniqueSlug,
  parsePositiveInteger,
  parseSearch,
  parseString,
  normalizeSort,
} from '../../utils/helpers';
import {
  ARTIST_POPULATE_SELECT,
  toArtistSummary,
  serializeDocIds,
  leanIdToString,
  type PopulatedArtistDoc,
} from './artist.helpers';
import { buildArtistDashboardStats } from '../../services/artistDashboardStats.service';
import {
  assertMonetizationPrice,
  resolveMonetizationPrice,
} from '../../utils/monetizationValidation';
import { coalesceMusicDownloadUrl } from '../../utils/musicDownloadUrl';
import {
  assertOwnerUserNotSuspended,
  deactivateRoleProfile,
  reactivateRoleProfile,
  createRoleProfileAppeal,
  loadAppealSummariesForProfile,
  shapeRolePortalMeta,
} from '../../services/roleProfileLifecycle.service';
import { isArtistOrPastorRoleActive } from '../../services/profileVisibility';
import { parseObjectId } from '../admin/admin.helpers';
import { assertMediaMetadata } from '../../utils/contentTaxonomyValidation';

type MusicWithArtistLean = IMusic & {
  artist?: PopulatedArtistDoc | mongoose.Types.ObjectId | null;
};

type VideoWithArtistLean = IVideo & {
  artist?: PopulatedArtistDoc | mongoose.Types.ObjectId | null;
};

/** Artist self-serve uploads are disabled; submissions go through WhatsApp / admin. */
export function rejectArtistMediaWrite(
  _request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  return Promise.reject(
    new AppError(
      'Content submissions are handled via WhatsApp. Contact the admin to publish your work.',
      403
    )
  );
}

/** Returns artist or throws 403 (no artist link) / 404 (artist record missing). */
async function getArtistForUser(userId: string): Promise<IArtist> {
  const user = await User.findById(userId)
    .select('artistId')
    .lean<Pick<IUser, 'artistId'> | null>();
  if (!user?.artistId) {
    throw new AppError('You do not have an associated artist profile', 403);
  }
  const artist = await Artist.findById(user.artistId).lean<IArtist | null>();
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

export async function getArtistMe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUser(auth.userId);
  const appeals = await loadAppealSummariesForProfile('artist', artist._id);
  const serialized = serializeDocIds(artist as unknown as Record<string, unknown>);
  const meta = shapeRolePortalMeta('artist', serialized, appeals);

  sendResponse(reply, 200, { artist: serialized, ...meta }, 'Artist profile loaded.');
}

export async function deactivateArtistMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUser(auth.userId);

  await deactivateRoleProfile({
    profileType: 'artist',
    profileId: artist._id,
    userId: parseObjectId(auth.userId, 'userId'),
  });

  sendResponse(reply, 200, { success: true }, 'Artist profile deactivated.');
}

export async function reactivateArtistMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUser(auth.userId);

  await reactivateRoleProfile({
    profileType: 'artist',
    profileId: artist._id,
    userId: parseObjectId(auth.userId, 'userId'),
  });

  sendResponse(reply, 200, { success: true }, 'Artist profile reactivated.');
}

export async function submitArtistAppeal(
  request: FastifyRequest<{ Body: { message?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUser(auth.userId);

  const appeal = await createRoleProfileAppeal({
    profileType: 'artist',
    profileId: artist._id,
    userId: parseObjectId(auth.userId, 'userId'),
    message: request.body?.message ?? '',
  });

  sendResponse(reply, 201, { appeal }, 'Appeal submitted.');
}

/**
 * Create the authenticated user's artist profile and set `user.artistId`.
 * 409 if a profile is already linked. Repairs `user.artistId` if an artist row exists with `user` set but the user doc was missing the link.
 */
export async function createArtistMe(
  request: FastifyRequest<{
    Body: {
      name: string;
      bio?: string;
      image?: string;
      coverImage?: string;
      genre?: string;
      socials?: Record<string, string>;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);

  if (!mongoose.Types.ObjectId.isValid(auth.userId)) {
    throw new AppError('Invalid user id', 400);
  }

  const userId = new mongoose.Types.ObjectId(auth.userId);
  const body = request.body ?? {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    throw new AppError('Name is required', 400);
  }

  const user = await User.findById(userId)
    .select('artistId')
    .lean<Pick<IUser, '_id' | 'artistId'> | null>();
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.artistId) {
    throw new AppError('You already have an artist profile', 409);
  }

  const linkedArtist = await Artist.findOne({ user: userId }).lean<IArtist | null>();
  if (linkedArtist) {
    await User.updateOne({ _id: userId }, { $set: { artistId: linkedArtist._id } });
    const serialized = serializeDocIds(linkedArtist as unknown as Record<string, unknown>);
    sendResponse(reply, 200, { artist: serialized }, 'Artist profile linked.');
    return;
  }

  const slug = await generateUniqueSlug(Artist, name);

  const artistDoc = (await Artist.create({
    user: userId,
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
  })) as HydratedDocument<ModelArtist>;

  const linked = await User.findOneAndUpdate(
    { _id: userId, artistId: null },
    { $set: { artistId: artistDoc._id } },
    { new: true }
  );

  if (!linked) {
    await Artist.deleteOne({ _id: artistDoc._id });
    throw new AppError('You already have an artist profile', 409);
  }

  const serialized = serializeDocIds(artistDoc.toObject() as unknown as Record<string, unknown>);
  sendResponse(reply, 201, { artist: serialized }, 'Artist profile created.');
}

export async function updateArtistMe(
  request: FastifyRequest<{
    Body: {
      name?: string;
      bio?: string;
      image?: string;
      coverImage?: string;
      genre?: string;
      socials?: Record<string, string>;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artistLean = await getArtistForUserOperational(auth.userId);
  const artistDoc = await Artist.findById(artistLean._id);
  if (!artistDoc) throw new AppError('Artist profile not found', 404);

  const body = request.body ?? {};
  if (body.name !== undefined) artistDoc.name = body.name;
  if (body.bio !== undefined) artistDoc.bio = body.bio;
  if (body.image !== undefined) artistDoc.image = body.image;
  if (body.coverImage !== undefined) artistDoc.coverImage = body.coverImage;
  if (body.genre !== undefined) artistDoc.genre = body.genre;
  if (body.socials !== undefined) artistDoc.socials = body.socials as typeof artistDoc.socials;

  await artistDoc.save();
  const artist = serializeDocIds(artistDoc.toObject() as unknown as Record<string, unknown>);
  sendResponse(reply, 200, { artist }, 'Artist profile loaded.');
}

export async function getDashboardStats(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUserOperational(auth.userId);
  const artistId = artist._id;

  const stats = await buildArtistDashboardStats(artistId, { includeTopLists: false });

  sendResponse(
    reply,
    200,
    {
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
    },
    'Artist dashboard stats loaded.'
  );
}

export async function getRecentUploads(
  request: FastifyRequest<{ Querystring?: { limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUserOperational(auth.userId);
  const limit = parsePositiveInteger(request.query?.limit, 6, 20);

  const { buildArtistRecentUploads } = await import('../../services/artistRecentUploads.service');
  const uploads = await buildArtistRecentUploads(artist._id, limit);

  sendResponse(reply, 200, { uploads }, 'Recent uploads loaded.');
}

const MUSIC_SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status'];

function shapeMusicItem(raw: MusicWithArtistLean): Record<string, unknown> {
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

export async function listMyMusic(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; status?: string; search?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUserOperational(auth.userId);
  const artistId = artist._id;

  const limit = parsePositiveInteger(request.query.limit, 10, 100);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(request.query.search);
  const status = parseString(request.query.status);
  const sortStr = normalizeSort(request.query.sort, MUSIC_SORT_FIELDS, '-createdAt');

  const filter: Record<string, unknown> = { artist: artistId };
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Music.find(filter)
      .sort(sortStr)
      .populate('artist', ARTIST_POPULATE_SELECT)
      .skip(skip)
      .limit(limit)
      .lean<MusicWithArtistLean[]>(),
    Music.countDocuments(filter),
  ]);

  const music = items.map(shapeMusicItem);

  sendResponse(
    reply,
    200,
    {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
      music,
    },
    'Artist music list loaded.'
  );
}

export async function getMusicItem(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUserOperational(auth.userId);
  const artistId = artist._id;

  if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
    throw new AppError('Invalid id', 400);
  }

  const doc = await Music.findOne({
    _id: new mongoose.Types.ObjectId(request.params.id),
    artist: artistId,
  })
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean<MusicWithArtistLean | null>();

  if (!doc) throw new AppError('Music not found', 404);

  const music = {
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

  sendResponse(reply, 200, { music }, 'Music loaded.');
}

export async function createMusic(
  request: FastifyRequest<{
    Body: {
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
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUserOperational(auth.userId);
  const artistId = artist._id;

  const body = request.body;
  const isMonetizable = body.isMonetizable ?? false;
  const metadata = assertMediaMetadata(body.metadata);

  assertMonetizationPrice(isMonetizable, body.price ?? 0);

  const baseSlug = slugify(body.title);
  let slug = baseSlug;
  let n = 0;
  while (await Music.findOne({ artist: artistId, slug })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const music = await Music.create({
    title: body.title,
    slug,
    artist: artistId,
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

  const populated = await Music.findById(music._id)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean<MusicWithArtistLean | null>();

  if (!populated) {
    sendResponse(
      reply,
      201,
      { music: shapeMusicItem(music.toObject() as MusicWithArtistLean) },
      'Music created.'
    );
    return;
  }

  const musicPayload = {
    _id: leanIdToString(populated._id),
    title: populated.title,
    slug: populated.slug,
    description: populated.description,
    lyrics: populated.lyrics,
    coverImage: populated.coverImage,
    audioUrl: populated.audioUrl,
    videoUrl: populated.videoUrl,
    category: populated.category,
    status: populated.status,
    isMonetizable: populated.isMonetizable,
    views: populated.views ?? 0,
    plays: populated.plays ?? 0,
    downloads: populated.downloads ?? 0,
    createdAt:
      populated.createdAt instanceof Date ? populated.createdAt.toISOString() : populated.createdAt,
    updatedAt:
      populated.updatedAt instanceof Date ? populated.updatedAt.toISOString() : populated.updatedAt,
    artist: toArtistSummary(populated.artist as PopulatedArtistDoc | null | undefined),
  };

  sendResponse(reply, 201, { music: musicPayload }, 'Music created.');
}

export async function updateMusic(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
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
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUserOperational(auth.userId);
  const artistId = artist._id;

  if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
    throw new AppError('Invalid id', 400);
  }

  const music = await Music.findOne({
    _id: new mongoose.Types.ObjectId(request.params.id),
    artist: artistId,
  });
  if (!music) throw new AppError('Music not found', 404);

  const body = request.body ?? {};
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

  const populated = await Music.findById(music._id)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean<MusicWithArtistLean | null>();
  if (!populated) {
    sendResponse(
      reply,
      200,
      { music: shapeMusicItem(music.toObject() as MusicWithArtistLean) },
      'Music updated.'
    );
    return;
  }

  const musicPayload = {
    _id: leanIdToString(populated._id),
    title: populated.title,
    slug: populated.slug,
    description: populated.description,
    lyrics: populated.lyrics,
    coverImage: populated.coverImage,
    audioUrl: populated.audioUrl,
    videoUrl: populated.videoUrl,
    category: populated.category,
    status: populated.status,
    isMonetizable: populated.isMonetizable,
    price: populated.price ?? 0,
    views: populated.views ?? 0,
    plays: populated.plays ?? 0,
    downloads: populated.downloads ?? 0,
    createdAt:
      populated.createdAt instanceof Date ? populated.createdAt.toISOString() : populated.createdAt,
    updatedAt:
      populated.updatedAt instanceof Date ? populated.updatedAt.toISOString() : populated.updatedAt,
    artist: toArtistSummary(populated.artist as PopulatedArtistDoc | null | undefined),
  };

  sendResponse(reply, 200, { music: musicPayload }, 'Music updated.');
}

export async function deleteMusic(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUserOperational(auth.userId);

  if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
    throw new AppError('Invalid id', 400);
  }

  const result = await Music.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(request.params.id),
      artist: artist._id,
    },
    { $set: { status: 'archived' } }
  );

  if (!result) throw new AppError('Music not found', 404);

  sendResponse(reply, 200, { success: true }, 'Music deleted.');
}

const VIDEO_SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status'];

function shapeVideoItem(raw: VideoWithArtistLean): Record<string, unknown> {
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

export async function listMyVideos(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; status?: string; search?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUserOperational(auth.userId);
  const artistId = artist._id;

  const limit = parsePositiveInteger(request.query.limit, 10, 100);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const search = parseSearch(request.query.search);
  const status = parseString(request.query.status);
  const sortStr = normalizeSort(request.query.sort, VIDEO_SORT_FIELDS, '-createdAt');

  const filter: Record<string, unknown> = { artist: artistId };
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Video.find(filter)
      .sort(sortStr)
      .populate('artist', ARTIST_POPULATE_SELECT)
      .skip(skip)
      .limit(limit)
      .lean<VideoWithArtistLean[]>(),
    Video.countDocuments(filter),
  ]);

  const videos = items.map(shapeVideoItem);

  sendResponse(
    reply,
    200,
    {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
      videos,
    },
    'Artist videos list loaded.'
  );
}

export async function getVideoItem(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUserOperational(auth.userId);
  const artistId = artist._id;

  if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
    throw new AppError('Invalid id', 400);
  }

  const doc = await Video.findOne({
    _id: new mongoose.Types.ObjectId(request.params.id),
    artist: artistId,
  })
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean<VideoWithArtistLean | null>();

  if (!doc) throw new AppError('Video not found', 404);

  const video = {
    _id: leanIdToString(doc._id),
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    thumbnail: doc.thumbnail,
    videoUrl: doc.videoUrl,
    videoFileUrl: doc.videoFileUrl,
    embedUrl: doc.embedUrl,
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

  sendResponse(reply, 200, { video }, 'Video loaded.');
}

export async function createVideo(
  request: FastifyRequest<{
    Body: {
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
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUserOperational(auth.userId);
  const artistId = artist._id;

  const body = request.body;
  const isMonetizable = body.isMonetizable ?? false;
  const metadata = assertMediaMetadata(body.metadata);

  assertMonetizationPrice(isMonetizable, body.price ?? 0);

  const baseSlug = slugify(body.title);
  let slug = baseSlug;
  let n = 0;
  while (await Video.findOne({ artist: artistId, slug })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const video = await Video.create({
    title: body.title,
    slug,
    artist: artistId,
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

  const populated = await Video.findById(video._id)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean<VideoWithArtistLean | null>();

  if (!populated) {
    sendResponse(
      reply,
      201,
      { video: shapeVideoItem(video.toObject() as VideoWithArtistLean) },
      'Video created.'
    );
    return;
  }

  const videoPayload = {
    _id: leanIdToString(populated._id),
    title: populated.title,
    slug: populated.slug,
    description: populated.description,
    thumbnail: populated.thumbnail,
    videoUrl: populated.videoUrl,
    category: populated.category,
    status: populated.status,
    isMonetizable: populated.isMonetizable,
    views: populated.views ?? 0,
    plays: populated.plays ?? 0,
    downloads: populated.downloads ?? 0,
    createdAt:
      populated.createdAt instanceof Date ? populated.createdAt.toISOString() : populated.createdAt,
    updatedAt:
      populated.updatedAt instanceof Date ? populated.updatedAt.toISOString() : populated.updatedAt,
    artist: toArtistSummary(populated.artist as PopulatedArtistDoc | null | undefined),
  };

  sendResponse(reply, 201, { video: videoPayload }, 'Video created.');
}

export async function updateVideo(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
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
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUserOperational(auth.userId);
  const artistId = artist._id;

  if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
    throw new AppError('Invalid id', 400);
  }

  const video = await Video.findOne({
    _id: new mongoose.Types.ObjectId(request.params.id),
    artist: artistId,
  });
  if (!video) throw new AppError('Video not found', 404);

  const body = request.body ?? {};
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

  const populated = await Video.findById(video._id)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean<VideoWithArtistLean | null>();
  if (!populated) {
    sendResponse(
      reply,
      200,
      { video: shapeVideoItem(video.toObject() as VideoWithArtistLean) },
      'Video updated.'
    );
    return;
  }

  const videoPayload = {
    _id: leanIdToString(populated._id),
    title: populated.title,
    slug: populated.slug,
    description: populated.description,
    thumbnail: populated.thumbnail,
    videoUrl: populated.videoUrl,
    category: populated.category,
    status: populated.status,
    isMonetizable: populated.isMonetizable,
    views: populated.views ?? 0,
    plays: populated.plays ?? 0,
    downloads: populated.downloads ?? 0,
    createdAt:
      populated.createdAt instanceof Date ? populated.createdAt.toISOString() : populated.createdAt,
    updatedAt:
      populated.updatedAt instanceof Date ? populated.updatedAt.toISOString() : populated.updatedAt,
    artist: toArtistSummary(populated.artist as PopulatedArtistDoc | null | undefined),
  };

  sendResponse(reply, 200, { video: videoPayload }, 'Video updated.');
}

export async function deleteVideo(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUserOperational(auth.userId);

  if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
    throw new AppError('Invalid id', 400);
  }

  const result = await Video.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(request.params.id),
      artist: artist._id,
    },
    { $set: { status: 'archived' } }
  );

  if (!result) throw new AppError('Video not found', 404);

  sendResponse(reply, 200, { success: true }, 'Video deleted.');
}
