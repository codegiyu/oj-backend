import { FastifyRequest, FastifyReply } from 'fastify';
import { Artist } from '../../models/artist';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug, parsePositiveInteger, parseSearch, parseString, normalizeSort } from '../../utils/helpers';
import { requireAdmin, parseObjectId } from './admin.helpers';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'name'];

function shapeArtistItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? String(raw._id) : raw._id,
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
  request: FastifyRequest<{ Querystring: { page?: string; limit?: string; search?: string; status?: string; sort?: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const limit = parsePositiveInteger(request.query.limit, 25, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  const search = parseSearch(request.query.search);
  const status = parseString(request.query.status);
  if (status === 'active') filter.isActive = true;
  else if (status === 'inactive') filter.isActive = false;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
      { genre: { $regex: search, $options: 'i' } },
    ];
  }

  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, '-createdAt');

  const [items, total] = await Promise.all([
    Artist.find(filter).sort(sortStr).skip(skip).limit(limit).lean(),
    Artist.countDocuments(filter),
  ]);

  const artists = (items as Record<string, unknown>[]).map(shapeArtistItem);

  sendResponse(reply, 200, {
    artists,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  }, 'Artists list loaded.');
}

export async function getAdminArtist(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const doc = await Artist.findById(id).lean();
  if (!doc) throw new AppError('Artist not found', 404);
  sendResponse(reply, 200, { artist: shapeArtistItem(doc as unknown as Record<string, unknown>) }, 'Artist loaded.');
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
  requireAdmin(request);
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
  sendResponse(reply, 201, { artist: shapeArtistItem((populated ?? artist) as unknown as Record<string, unknown>) }, 'Artist created.');
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
  requireAdmin(request);
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
  sendResponse(reply, 200, { artist: shapeArtistItem((populated ?? artist.toObject()) as Record<string, unknown>) }, 'Artist updated.');
}

export async function deleteAdminArtist(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const result = await Artist.findByIdAndDelete(id);
  if (!result) throw new AppError('Artist not found', 404);
  sendResponse(reply, 200, { success: true }, 'Artist deleted.');
}
