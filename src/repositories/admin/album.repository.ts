import { Album } from '../../models/album';
import { Music } from '../../models/music';
import mongoose, { type HydratedDocument } from 'mongoose';
import type { ModelAlbum } from '../../lib/types/constants';
import { paginatedFind, findByIdLean } from './paginatedList.repository';
import { adminArtistPopulate } from './populate';

export type AlbumDocument = HydratedDocument<ModelAlbum>;

export const albumMongooseModel: mongoose.Model<ModelAlbum> = Album;

type AlbumTrackFilter = {
  album: mongoose.Types.ObjectId | string;
  status?: 'draft' | 'published' | 'archived';
};

export type ListAdminAlbumOptions = {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
};

export async function listAdminAlbumRows(
  options: ListAdminAlbumOptions
): Promise<{ items: ModelAlbum[]; total: number }> {
  return paginatedFind<ModelAlbum>(Album, {
    filter: options.filter,
    sort: options.sort,
    skip: options.skip,
    limit: options.limit,
    populate: adminArtistPopulate,
  });
}

export async function findAdminAlbumById(id: string): Promise<ModelAlbum | null> {
  return findByIdLean<ModelAlbum>(Album, id, adminArtistPopulate);
}

export async function createAlbumDoc(
  data: Partial<ModelAlbum> & Pick<ModelAlbum, 'title' | 'slug'>
): Promise<AlbumDocument> {
  return Album.create(data);
}

export async function findAlbumDocumentById(
  id: mongoose.Types.ObjectId
): Promise<AlbumDocument | null> {
  return Album.findById(id);
}

export async function findAlbumPopulatedLean(id: unknown): Promise<ModelAlbum | null> {
  return findByIdLean<ModelAlbum>(Album, String(id), adminArtistPopulate);
}

export async function deleteAlbumDocumentById(
  id: mongoose.Types.ObjectId
): Promise<AlbumDocument | null> {
  return Album.findByIdAndDelete(id);
}

export async function countMusicTracksForAlbum(
  albumId: mongoose.Types.ObjectId | string
): Promise<number> {
  const filter: AlbumTrackFilter = { album: albumId };

  return Music.countDocuments(filter);
}

export async function listMusicTracksForAlbum(
  albumId: mongoose.Types.ObjectId | string,
  options?: { publishedOnly?: boolean }
): Promise<Record<string, unknown>[]> {
  const filter: AlbumTrackFilter = { album: albumId };

  if (options?.publishedOnly) {
    filter.status = 'published';
  }

  const items = await Music.find(filter)
    .sort({ displayOrder: 1, createdAt: 1 })
    .populate('artist', '_id name slug image')
    .lean();

  return items as unknown as Record<string, unknown>[];
}
