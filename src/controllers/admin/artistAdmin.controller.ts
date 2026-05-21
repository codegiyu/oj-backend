import { FastifyRequest, FastifyReply } from 'fastify';
import { Artist } from '../../models/artist';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug, parseString } from '../../utils/helpers';
import { leanIdToString, parseObjectId } from './admin.helpers';
import { runAdminList, runAdminGet } from '../../services/admin/runAdminListGet';
import {
  listAdminArtistRows,
  findAdminArtistById,
} from '../../repositories/admin/artist.repository';
import { buildArtistDashboardStats } from '../../services/artistDashboardStats.service';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'name'];

function shapeArtistItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    name: raw.name,
    slug: raw.slug,
    bio: raw.bio,
    image: raw.image,
    coverImage: raw.coverImage,
    genre: raw.genre,
    socials: raw.socials,
    isFeatured: raw.isFeatured,
    isActive: raw.isActive,
    displayOrder: raw.displayOrder,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

export async function listAdminArtists(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string; status?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: SORT_FIELDS,
    searchFields: ['name', 'slug', 'genre'],
    extendFilter: (filter, query) => {
      const status = parseString(query.status);

      if (status === 'active') {
        filter.isActive = true;
        delete filter.status;
      } else if (status === 'inactive') {
        filter.isActive = false;
        delete filter.status;
      }
    },
    listRows: listAdminArtistRows,
    shapeItem: shapeArtistItem,
    collectionKey: 'artists',
    message: 'Artists list loaded.',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminArtist(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminGet(request, {
    findById: findAdminArtistById,
    shapeItem: shapeArtistItem,
    itemKey: 'artist',
    message: 'Artist loaded.',
    notFoundMessage: 'Artist not found',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function createAdminArtist(
  request: FastifyRequest<{
    Body: {
      name: string;
      bio?: string;
      image?: string;
      coverImage?: string;
      genre?: string;
      socials?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        youtube?: string;
        website?: string;
      };
      isFeatured?: boolean;
      isActive?: boolean;
      displayOrder?: number;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body;
  if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) {
    throw new AppError('Name is required', 400);
  }

  const slug = await generateUniqueSlug(Artist, body.name.trim());

  const artist = await Artist.create({
    name: body.name.trim(),
    slug,
    bio: body.bio ?? '',
    image: body.image ?? '',
    coverImage: body.coverImage ?? '',
    genre: body.genre ?? '',
    socials: body.socials ?? {},
    isFeatured: body.isFeatured ?? false,
    isActive: body.isActive ?? true,
    displayOrder: body.displayOrder ?? 0,
  });

  const populated = await Artist.findById(artist._id).lean();
  sendResponse(
    reply,
    201,
    { artist: shapeArtistItem((populated ?? artist) as unknown as Record<string, unknown>) },
    'Artist created.'
  );
}

export async function updateAdminArtist(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      name?: string;
      bio?: string;
      image?: string;
      coverImage?: string;
      genre?: string;
      socials?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
        youtube?: string;
        website?: string;
      };
      isFeatured?: boolean;
      isActive?: boolean;
      displayOrder?: number;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const artist = await Artist.findById(id);
  if (!artist) throw new AppError('Artist not found', 404);

  const body = request.body ?? {};
  if (body.name !== undefined) artist.name = body.name;
  if (body.bio !== undefined) artist.bio = body.bio;
  if (body.image !== undefined) artist.image = body.image;
  if (body.coverImage !== undefined) artist.coverImage = body.coverImage;
  if (body.genre !== undefined) artist.genre = body.genre;
  if (body.socials !== undefined) artist.socials = body.socials ?? artist.socials;
  if (body.isFeatured !== undefined) artist.isFeatured = body.isFeatured;
  if (body.isActive !== undefined) artist.isActive = body.isActive;
  if (body.displayOrder !== undefined) artist.displayOrder = body.displayOrder;

  await artist.save();

  const populated = await Artist.findById(artist._id).lean();
  sendResponse(
    reply,
    200,
    {
      artist: shapeArtistItem(
        (populated ?? artist.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Artist updated.'
  );
}

export async function deleteAdminArtist(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const result = await Artist.findByIdAndDelete(id);
  if (!result) throw new AppError('Artist not found', 404);
  sendResponse(reply, 200, { success: true }, 'Artist deleted.');
}

export async function getAdminArtistDashboardStats(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const artist = await Artist.findById(id).select('_id').lean();
  if (!artist) throw new AppError('Artist not found', 404);
  const stats = await buildArtistDashboardStats(artist._id, { includeTopLists: true });
  sendResponse(
    reply,
    200,
    { ...stats } as unknown as Record<string, unknown>,
    'Artist dashboard stats loaded.'
  );
}
