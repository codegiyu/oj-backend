import { FastifyRequest, FastifyReply } from 'fastify';
import { ContentCategory } from '../../models/contentCategory';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import {
  parsePositiveInteger,
  parseSearch,
  parseString,
  normalizeSort,
  generateUniqueSlug,
} from '../../utils/helpers';
import { parseObjectId } from './admin.helpers';
import type { ContentCategoryScope } from '../../lib/types/constants';
import { CONTENT_CATEGORY_SCOPES } from '../../lib/types/constants';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'displayOrder'];

function shapeCategory(raw: Record<string, unknown>): Record<string, unknown> {
  const rawId = raw._id;
  const id =
    typeof rawId === 'string' ||
    typeof rawId === 'number' ||
    typeof rawId === 'bigint' ||
    typeof rawId === 'boolean'
      ? `${rawId}`
      : rawId &&
          typeof rawId === 'object' &&
          'toHexString' in rawId &&
          typeof (rawId as { toHexString?: unknown }).toHexString === 'function'
        ? (rawId as { toHexString: () => string }).toHexString()
        : rawId;

  return {
    _id: id,
    name: raw.name,
    slug: raw.slug,
    scope: raw.scope,
    displayOrder: raw.displayOrder ?? 0,
    isActive: raw.isActive ?? true,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

export async function listAdminContentCategories(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string; scope?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const limit = parsePositiveInteger(request.query.limit, 25, 100);
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};
  const scope = parseString(request.query.scope);
  if (scope && (CONTENT_CATEGORY_SCOPES as readonly string[]).includes(scope)) {
    filter.scope = scope;
  }
  const search = parseSearch(request.query.search);
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }
  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, 'displayOrder');
  const [items, total] = await Promise.all([
    ContentCategory.find(filter).sort(sortStr).skip(skip).limit(limit).lean(),
    ContentCategory.countDocuments(filter),
  ]);
  const categories = (items as unknown as Record<string, unknown>[]).map(shapeCategory);
  sendResponse(
    reply,
    200,
    {
      categories,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    },
    'Content categories loaded.'
  );
}

export async function createAdminContentCategory(
  request: FastifyRequest<{
    Body: { name: string; scope: ContentCategoryScope; displayOrder?: number; isActive?: boolean };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body;
  if (!body?.name?.trim()) throw new AppError('Name is required', 400);
  if (!body.scope || !(CONTENT_CATEGORY_SCOPES as readonly string[]).includes(body.scope)) {
    throw new AppError('Invalid scope', 400);
  }
  const slug = await generateUniqueSlug(ContentCategory as never, body.name.trim(), {
    scope: body.scope,
  });
  const doc = await ContentCategory.create({
    name: body.name.trim(),
    slug,
    scope: body.scope,
    displayOrder: body.displayOrder ?? 0,
    isActive: body.isActive ?? true,
  });
  const populated = await ContentCategory.findById(doc._id).lean();
  sendResponse(
    reply,
    201,
    {
      category: shapeCategory((populated ?? doc.toObject()) as unknown as Record<string, unknown>),
    },
    'Category created.'
  );
}

export async function updateAdminContentCategory(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      name?: string;
      scope?: ContentCategoryScope;
      displayOrder?: number;
      isActive?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const cat = await ContentCategory.findById(id);
  if (!cat) throw new AppError('Category not found', 404);
  const body = request.body ?? {};
  if (body.name !== undefined) cat.name = body.name;
  if (body.scope !== undefined) {
    if (!(CONTENT_CATEGORY_SCOPES as readonly string[]).includes(body.scope))
      throw new AppError('Invalid scope', 400);
    cat.scope = body.scope;
  }
  if (body.displayOrder !== undefined) cat.displayOrder = body.displayOrder;
  if (body.isActive !== undefined) cat.isActive = body.isActive;
  await cat.save();
  const populated = await ContentCategory.findById(cat._id).lean();
  sendResponse(
    reply,
    200,
    {
      category: shapeCategory((populated ?? cat.toObject()) as unknown as Record<string, unknown>),
    },
    'Category updated.'
  );
}

export async function deleteAdminContentCategory(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const result = await ContentCategory.findByIdAndDelete(id);
  if (!result) throw new AppError('Category not found', 404);
  sendResponse(reply, 200, { success: true }, 'Category deleted.');
}
