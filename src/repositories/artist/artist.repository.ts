import mongoose, { type HydratedDocument } from 'mongoose';
import { Artist } from '../../models/artist';
import { Music } from '../../models/music';
import { Video } from '../../models/video';
import { User } from '../../models/user';
import type { IArtist, IMusic, IVideo, IUser, ModelArtist } from '../../lib/types/constants';
import { ARTIST_POPULATE_SELECT } from '../../controllers/artist/artist.helpers';
import type { PopulatedArtistDoc } from '../../controllers/artist/artist.helpers';

export type MusicWithArtistLean = IMusic & {
  artist?: PopulatedArtistDoc | mongoose.Types.ObjectId | null;
};

export type VideoWithArtistLean = IVideo & {
  artist?: PopulatedArtistDoc | mongoose.Types.ObjectId | null;
};

export async function findUserArtistId(
  userId: mongoose.Types.ObjectId
): Promise<Pick<IUser, 'artistId'> | null> {
  return User.findById(userId).select('artistId').lean<Pick<IUser, 'artistId'> | null>();
}

export async function findArtistLeanById(
  artistId: mongoose.Types.ObjectId
): Promise<IArtist | null> {
  return Artist.findById(artistId).lean<IArtist | null>();
}

export async function findArtistByUserId(userId: mongoose.Types.ObjectId): Promise<IArtist | null> {
  return Artist.findOne({ user: userId }).lean<IArtist | null>();
}

export async function linkUserArtistIdIfUnset(
  userId: mongoose.Types.ObjectId,
  artistId: mongoose.Types.ObjectId
): Promise<IUser | null> {
  return User.findOneAndUpdate(
    { _id: userId, artistId: null },
    { $set: { artistId } },
    { new: true }
  );
}

export async function createArtistRecord(
  data: Record<string, unknown>
): Promise<HydratedDocument<ModelArtist>> {
  return Artist.create(data) as Promise<HydratedDocument<ModelArtist>>;
}

export async function deleteArtistRecord(artistId: mongoose.Types.ObjectId): Promise<void> {
  await Artist.deleteOne({ _id: artistId });
}

export async function findArtistDocumentById(
  artistId: mongoose.Types.ObjectId
): Promise<HydratedDocument<ModelArtist> | null> {
  return Artist.findById(artistId);
}

export async function listMusicForArtist(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}): Promise<MusicWithArtistLean[]> {
  return Music.find(options.filter)
    .sort(options.sort)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .skip(options.skip)
    .limit(options.limit)
    .lean<MusicWithArtistLean[]>();
}

export async function countMusicForArtist(filter: Record<string, unknown>): Promise<number> {
  return Music.countDocuments(filter);
}

export async function findMusicForArtistById(
  musicId: mongoose.Types.ObjectId,
  artistId: mongoose.Types.ObjectId
): Promise<MusicWithArtistLean | null> {
  return Music.findOne({ _id: musicId, artist: artistId })
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean<MusicWithArtistLean | null>();
}

export async function findMusicDocumentForArtist(
  musicId: mongoose.Types.ObjectId,
  artistId: mongoose.Types.ObjectId
): Promise<HydratedDocument<IMusic> | null> {
  return Music.findOne({ _id: musicId, artist: artistId });
}

export async function findMusicByArtistSlug(
  artistId: mongoose.Types.ObjectId,
  slug: string
): Promise<{ _id: unknown } | null> {
  return Music.findOne({ artist: artistId, slug }).select('_id').lean();
}

export async function createMusicRecord(data: Record<string, unknown>): Promise<IMusic> {
  return Music.create(data);
}

export async function findMusicPopulatedById(
  musicId: mongoose.Types.ObjectId
): Promise<MusicWithArtistLean | null> {
  return Music.findById(musicId)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean<MusicWithArtistLean | null>();
}

export async function archiveMusicForArtist(
  musicId: mongoose.Types.ObjectId,
  artistId: mongoose.Types.ObjectId
): Promise<IMusic | null> {
  return Music.findOneAndUpdate(
    { _id: musicId, artist: artistId },
    { $set: { status: 'archived' } }
  );
}

export async function listVideosForArtist(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}): Promise<VideoWithArtistLean[]> {
  return Video.find(options.filter)
    .sort(options.sort)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .skip(options.skip)
    .limit(options.limit)
    .lean<VideoWithArtistLean[]>();
}

export async function countVideosForArtist(filter: Record<string, unknown>): Promise<number> {
  return Video.countDocuments(filter);
}

export async function findVideoForArtistById(
  videoId: mongoose.Types.ObjectId,
  artistId: mongoose.Types.ObjectId
): Promise<VideoWithArtistLean | null> {
  return Video.findOne({ _id: videoId, artist: artistId })
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean<VideoWithArtistLean | null>();
}

export async function findVideoDocumentForArtist(
  videoId: mongoose.Types.ObjectId,
  artistId: mongoose.Types.ObjectId
): Promise<HydratedDocument<IVideo> | null> {
  return Video.findOne({ _id: videoId, artist: artistId });
}

export async function findVideoByArtistSlug(
  artistId: mongoose.Types.ObjectId,
  slug: string
): Promise<{ _id: unknown } | null> {
  return Video.findOne({ artist: artistId, slug }).select('_id').lean();
}

export async function createVideoRecord(data: Record<string, unknown>): Promise<IVideo> {
  return Video.create(data);
}

export async function findVideoPopulatedById(
  videoId: mongoose.Types.ObjectId
): Promise<VideoWithArtistLean | null> {
  return Video.findById(videoId)
    .populate('artist', ARTIST_POPULATE_SELECT)
    .lean<VideoWithArtistLean | null>();
}

export async function archiveVideoForArtist(
  videoId: mongoose.Types.ObjectId,
  artistId: mongoose.Types.ObjectId
): Promise<IVideo | null> {
  return Video.findOneAndUpdate(
    { _id: videoId, artist: artistId },
    { $set: { status: 'archived' } }
  );
}
