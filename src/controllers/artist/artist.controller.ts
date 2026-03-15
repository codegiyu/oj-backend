import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Artist } from '../../models/artist';
import { Music } from '../../models/music';
import { Video } from '../../models/video';
import { User } from '../../models/user';
import { AppError } from '../../utils/AppError';
import { getAuthUser } from '../../utils/getAuthUser';
import { sendResponse } from '../../utils/response';
import {
  slugify,
  parsePositiveInteger,
  parseSearch,
  parseString,
  normalizeSort,
} from '../../utils/helpers';
import {
  ARTIST_POPULATE_SELECT,
  toArtistSummary,
  serializeDocIds,
} from './artist.helpers';

/** Returns artist or throws 403 (no artist link) / 404 (artist record missing). */
async function getArtistForUser(userId: string) {
  const user = await User.findById(userId).select('artistId').lean();
  if (!user?.artistId) {
    throw new AppError('You do not have an associated artist profile', 403);
  }
  const artist = await Artist.findById(
    (user as { artistId: mongoose.Types.ObjectId }).artistId
  ).lean();
  if (!artist) {
    throw new AppError('Artist profile not found', 404);
  }
  return artist;
}

export async function getArtistMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUser(auth.userId);
  const serialized = serializeDocIds(artist as Record<string, unknown>);
  sendResponse(reply, 200, { artist: serialized }, 'Artist profile loaded.');
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
  const artistLean = await getArtistForUser(auth.userId);
  const artistDoc = await Artist.findById((artistLean as { _id: mongoose.Types.ObjectId })._id);
  if (!artistDoc) throw new AppError('Artist profile not found', 404);

  const body = request.body ?? {};
  if (body.name !== undefined) artistDoc.name = body.name;
  if (body.bio !== undefined) artistDoc.bio = body.bio;
  if (body.image !== undefined) artistDoc.image = body.image;
  if (body.coverImage !== undefined) artistDoc.coverImage = body.coverImage;
  if (body.genre !== undefined) artistDoc.genre = body.genre;
  if (body.socials !== undefined) artistDoc.socials = body.socials as typeof artistDoc.socials;

  await artistDoc.save();
  const artist = serializeDocIds(artistDoc.toObject() as Record<string, unknown>);
  sendResponse(reply, 200, { artist }, 'Artist profile loaded.');
}

export async function getDashboardStats(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUser(auth.userId);
  const artistId = (artist as { _id: mongoose.Types.ObjectId })._id;

  const [tracksCount, videosCount, musicPlaysResult, videoViewsResult] = await Promise.all([
    Music.countDocuments({ artist: artistId }),
    Video.countDocuments({ artist: artistId }),
    Music.aggregate<{ total: number }>([
      { $match: { artist: artistId } },
      { $group: { _id: null, total: { $sum: '$plays' } } },
    ]),
    Video.aggregate<{ total: number }>([
      { $match: { artist: artistId } },
      { $group: { _id: null, total: { $sum: '$views' } } },
    ]),
  ]);

  const totalPlays = musicPlaysResult[0]?.total ?? 0;
  const totalViews = videoViewsResult[0]?.total ?? 0;

  sendResponse(reply, 200, {
    tracksCount,
    videosCount,
    totalPlays,
    totalViews,
  }, 'Artist dashboard stats loaded.');
}

const MUSIC_SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status'];

function shapeMusicItem(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as Parameters<typeof toArtistSummary>[0]);
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    status: raw.status,
    description: raw.description,
    coverImage: raw.coverImage,
    audioUrl: raw.audioUrl,
    plays: raw.plays ?? 0,
    downloads: raw.downloads ?? 0,
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
  const artist = await getArtistForUser(auth.userId);
  const artistId = (artist as { _id: mongoose.Types.ObjectId })._id;

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
      .lean(),
    Music.countDocuments(filter),
  ]);

  const music = (items as Record<string, unknown>[]).map(shapeMusicItem);

  sendResponse(reply, 200, {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    music,
  }, 'Artist music list loaded.');
}

export async function getMusicItem(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUser(auth.userId);
  const artistId = (artist as { _id: mongoose.Types.ObjectId })._id;

  if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
    throw new AppError('Invalid id', 400);
  }

  const doc = await Music.findOne({
    _id: new mongoose.Types.ObjectId(request.params.id),
    artist: artistId,
  })
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean();

  if (!doc) throw new AppError('Music not found', 404);

  const music = {
    _id: String(doc._id),
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
    plays: doc.plays ?? 0,
    downloads: doc.downloads ?? 0,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    artist: toArtistSummary(doc.artist as Parameters<typeof toArtistSummary>[0]),
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
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUser(auth.userId);
  const artistId = (artist as { _id: mongoose.Types.ObjectId })._id;

  const body = request.body;
  let baseSlug = slugify(body.title);
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
    category: body.category ?? '',
    status: 'draft',
    isMonetizable: body.isMonetizable ?? false,
    isFeatured: false,
    displayOrder: 0,
    plays: 0,
    downloads: 0,
  });

  const populated = await Music.findById(music._id)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean();

  if (!populated) {
    sendResponse(reply, 201, { music: shapeMusicItem(music as unknown as Record<string, unknown>) }, 'Music created.');
    return;
  }

  const musicPayload = {
    _id: String(populated._id),
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
    plays: populated.plays ?? 0,
    downloads: populated.downloads ?? 0,
    createdAt: populated.createdAt instanceof Date ? populated.createdAt.toISOString() : populated.createdAt,
    updatedAt: populated.updatedAt instanceof Date ? populated.updatedAt.toISOString() : populated.updatedAt,
    artist: toArtistSummary(populated.artist as Parameters<typeof toArtistSummary>[0]),
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
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUser(auth.userId);
  const artistId = (artist as { _id: mongoose.Types.ObjectId })._id;

  if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
    throw new AppError('Invalid id', 400);
  }

  const music = await Music.findOne({
    _id: new mongoose.Types.ObjectId(request.params.id),
    artist: artistId,
  });
  if (!music) throw new AppError('Music not found', 404);

  const body = request.body ?? {};
  if (body.title !== undefined) music.title = body.title;
  if (body.description !== undefined) music.description = body.description;
  if (body.lyrics !== undefined) music.lyrics = body.lyrics;
  if (body.coverImage !== undefined) music.coverImage = body.coverImage;
  if (body.audioUrl !== undefined) music.audioUrl = body.audioUrl;
  if (body.videoUrl !== undefined) music.videoUrl = body.videoUrl;
  if (body.category !== undefined) music.category = body.category;
  if (body.status !== undefined) music.status = body.status as 'draft' | 'published' | 'archived';
  if (body.isMonetizable !== undefined) music.isMonetizable = body.isMonetizable;

  await music.save();

  const populated = await Music.findById(music._id)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean();
  if (!populated) {
    sendResponse(reply, 200, { music: shapeMusicItem(music.toObject() as Record<string, unknown>) }, 'Music updated.');
    return;
  }

  const musicPayload = {
    _id: String(populated._id),
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
    plays: populated.plays ?? 0,
    downloads: populated.downloads ?? 0,
    createdAt: populated.createdAt instanceof Date ? populated.createdAt.toISOString() : populated.createdAt,
    updatedAt: populated.updatedAt instanceof Date ? populated.updatedAt.toISOString() : populated.updatedAt,
    artist: toArtistSummary(populated.artist as Parameters<typeof toArtistSummary>[0]),
  };

  sendResponse(reply, 200, { music: musicPayload }, 'Music updated.');
}

export async function deleteMusic(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUser(auth.userId);

  if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
    throw new AppError('Invalid id', 400);
  }

  const result = await Music.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(request.params.id), artist: (artist as { _id: mongoose.Types.ObjectId })._id },
    { $set: { status: 'archived' } }
  );

  if (!result) throw new AppError('Music not found', 404);

  sendResponse(reply, 200, { success: true }, 'Music deleted.');
}

const VIDEO_SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'status'];

function shapeVideoItem(raw: Record<string, unknown>): Record<string, unknown> {
  const artist = toArtistSummary(raw.artist as Parameters<typeof toArtistSummary>[0]);
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
    title: raw.title,
    slug: raw.slug,
    status: raw.status,
    description: raw.description,
    thumbnail: raw.thumbnail,
    videoUrl: raw.videoUrl,
    views: raw.views ?? 0,
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
  const artist = await getArtistForUser(auth.userId);
  const artistId = (artist as { _id: mongoose.Types.ObjectId })._id;

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
      .lean(),
    Video.countDocuments(filter),
  ]);

  const videos = (items as Record<string, unknown>[]).map(shapeVideoItem);

  sendResponse(reply, 200, {
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
    videos,
  }, 'Artist videos list loaded.');
}

export async function getVideoItem(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUser(auth.userId);
  const artistId = (artist as { _id: mongoose.Types.ObjectId })._id;

  if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
    throw new AppError('Invalid id', 400);
  }

  const doc = await Video.findOne({
    _id: new mongoose.Types.ObjectId(request.params.id),
    artist: artistId,
  })
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean();

  if (!doc) throw new AppError('Video not found', 404);

  const video = {
    _id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    thumbnail: doc.thumbnail,
    videoUrl: doc.videoUrl,
    category: doc.category,
    status: doc.status,
    isMonetizable: doc.isMonetizable,
    views: doc.views ?? 0,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
    artist: toArtistSummary(doc.artist as Parameters<typeof toArtistSummary>[0]),
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
      category?: string;
      isMonetizable?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUser(auth.userId);
  const artistId = (artist as { _id: mongoose.Types.ObjectId })._id;

  const body = request.body;
  let baseSlug = slugify(body.title);
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
    category: body.category ?? '',
    status: 'draft',
    isMonetizable: body.isMonetizable ?? false,
    isFeatured: false,
    displayOrder: 0,
    views: 0,
  });

  const populated = await Video.findById(video._id)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean();

  if (!populated) {
    sendResponse(reply, 201, { video: shapeVideoItem(video as unknown as Record<string, unknown>) }, 'Video created.');
    return;
  }

  const videoPayload = {
    _id: String(populated._id),
    title: populated.title,
    slug: populated.slug,
    description: populated.description,
    thumbnail: populated.thumbnail,
    videoUrl: populated.videoUrl,
    category: populated.category,
    status: populated.status,
    isMonetizable: populated.isMonetizable,
    views: populated.views ?? 0,
    createdAt: populated.createdAt instanceof Date ? populated.createdAt.toISOString() : populated.createdAt,
    updatedAt: populated.updatedAt instanceof Date ? populated.updatedAt.toISOString() : populated.updatedAt,
    artist: toArtistSummary(populated.artist as Parameters<typeof toArtistSummary>[0]),
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
      category?: string;
      status?: string;
      isMonetizable?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUser(auth.userId);
  const artistId = (artist as { _id: mongoose.Types.ObjectId })._id;

  if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
    throw new AppError('Invalid id', 400);
  }

  const video = await Video.findOne({
    _id: new mongoose.Types.ObjectId(request.params.id),
    artist: artistId,
  });
  if (!video) throw new AppError('Video not found', 404);

  const body = request.body ?? {};
  if (body.title !== undefined) video.title = body.title;
  if (body.description !== undefined) video.description = body.description;
  if (body.thumbnail !== undefined) video.thumbnail = body.thumbnail;
  if (body.videoUrl !== undefined) video.videoUrl = body.videoUrl;
  if (body.category !== undefined) video.category = body.category;
  if (body.status !== undefined) video.status = body.status as 'draft' | 'published' | 'archived';
  if (body.isMonetizable !== undefined) video.isMonetizable = body.isMonetizable;

  await video.save();

  const populated = await Video.findById(video._id)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean();
  if (!populated) {
    sendResponse(reply, 200, { video: shapeVideoItem(video.toObject() as Record<string, unknown>) }, 'Video updated.');
    return;
  }

  const videoPayload = {
    _id: String(populated._id),
    title: populated.title,
    slug: populated.slug,
    description: populated.description,
    thumbnail: populated.thumbnail,
    videoUrl: populated.videoUrl,
    category: populated.category,
    status: populated.status,
    isMonetizable: populated.isMonetizable,
    views: populated.views ?? 0,
    createdAt: populated.createdAt instanceof Date ? populated.createdAt.toISOString() : populated.createdAt,
    updatedAt: populated.updatedAt instanceof Date ? populated.updatedAt.toISOString() : populated.updatedAt,
    artist: toArtistSummary(populated.artist as Parameters<typeof toArtistSummary>[0]),
  };

  sendResponse(reply, 200, { video: videoPayload }, 'Video updated.');
}

export async function deleteVideo(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'client-access') throw new AppError('Unauthorized', 401);
  const artist = await getArtistForUser(auth.userId);

  if (!mongoose.Types.ObjectId.isValid(request.params.id)) {
    throw new AppError('Invalid id', 400);
  }

  const result = await Video.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(request.params.id), artist: (artist as { _id: mongoose.Types.ObjectId })._id },
    { $set: { status: 'archived' } }
  );

  if (!result) throw new AppError('Video not found', 404);

  sendResponse(reply, 200, { success: true }, 'Video deleted.');
}
