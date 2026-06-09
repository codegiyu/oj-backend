import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generatePresignedUrl, getContentTypeFromExtension } from '../../services/r2.service';
import { Document } from '../../models/document';
import {
  isAllowedUploadExtension,
  normalizeUploadExtension,
} from '../../constants/uploadAllowlist';
import { ENTITY_TYPES, UPLOAD_INTENTS } from '../../lib/types/constants';
import type { EntityType, UploadIntent } from '../../lib/types/constants';
import { getAuthUser } from '../../utils/getAuthUser';
import { User } from '../../models/user';
import { Product } from '../../models/product';

const ENTITY_TYPES_SET = new Set<string>(ENTITY_TYPES);
const UPLOAD_INTENTS_SET = new Set<string>(UPLOAD_INTENTS);

const ALLOWED_CLIENT_INTENTS: UploadIntent[] = [
  'avatar',
  'logo',
  'card-image',
  'banner-image',
  'image',
  'other',
];

async function assertClientEntityUploadAllowed(
  userId: string,
  entityType: string,
  entityId: string
): Promise<void> {
  if (entityType === 'user' && entityId === userId) return;

  const dbUser = await User.findById(userId).select('vendorId').lean();
  const vendorId = dbUser?.vendorId ? String(dbUser.vendorId) : '';

  if (entityType === 'vendor') {
    if (!vendorId || entityId !== vendorId) {
      throw new AppError('You can only upload for your own vendor profile', 403);
    }
    return;
  }

  if (entityType === 'product') {
    if (!vendorId) throw new AppError('Vendor profile required for product uploads', 403);
    const product = await Product.findById(entityId).select('vendor').lean();
    if (!product) throw new AppError('Product not found', 404);
    if (String((product as { vendor?: unknown }).vendor) !== vendorId) {
      throw new AppError('You can only upload images for your own products', 403);
    }
    return;
  }

  throw new AppError('You are not allowed to upload for this entity', 403);
}

function resolveContentType(
  fileExtension: string,
  contentType: string | undefined,
  intent: UploadIntent
): string {
  const ext = (fileExtension ?? '').trim().replace(/^\./, '');
  if (contentType?.trim()) return contentType.trim();
  if (ext) return getContentTypeFromExtension(ext);
  if (['avatar', 'logo', 'card-image', 'banner-image', 'image'].includes(intent)) {
    return 'image/jpeg';
  }
  return 'application/octet-stream';
}

const expiresInSeconds = 3600;

export type PresignedBody = {
  entityType?: string;
  entityId?: string;
  intent?: string;
  fileExtension?: string;
  contentType?: string;
  files?: Array<{ fileExtension: string; contentType?: string }>;
};

type PresignedContext = {
  uploadedByModel: 'User' | 'Admin';
  userId: string;
  allowedIntents?: UploadIntent[];
  assertEntityOwnership?: (entityType: string, entityId: string) => Promise<void>;
};

async function handlePresignedUrlRequest(
  body: PresignedBody,
  ctx: PresignedContext,
  reply: FastifyReply
): Promise<void> {
  const { entityType, entityId, intent, fileExtension, contentType, files } = body;

  if (!entityType || !entityId || !intent) {
    throw new AppError('entityType, entityId, and intent are required', 400);
  }
  if (!ENTITY_TYPES_SET.has(entityType)) {
    throw new AppError(`Invalid entityType: ${entityType}`, 400);
  }
  if (ctx.assertEntityOwnership) {
    await ctx.assertEntityOwnership(entityType, entityId);
  }
  if (!UPLOAD_INTENTS_SET.has(intent)) {
    throw new AppError(`Invalid intent: ${intent}`, 400);
  }
  if (ctx.allowedIntents && !ctx.allowedIntents.includes(intent as UploadIntent)) {
    throw new AppError('This intent is not allowed for client uploads', 403);
  }
  if (!mongoose.Types.ObjectId.isValid(entityId)) {
    throw new AppError('Invalid entityId', 400);
  }

  const narrowedEntityType = entityType as EntityType;
  const narrowedIntent = intent as UploadIntent;

  const filesArray = Array.isArray(files) ? files : [];
  const hasSingle = fileExtension !== undefined;
  const hasBatch = filesArray.length > 0;
  if (!hasSingle && !hasBatch) {
    throw new AppError('Provide fileExtension (and optionally contentType) or files array', 400);
  }
  if (hasSingle && hasBatch) {
    throw new AppError('Provide either single file or files array, not both', 400);
  }

  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  if (hasBatch) {
    if (filesArray.length > 20) {
      throw new AppError('Maximum 20 files per request', 400);
    }
    const uploads = await Promise.all(
      filesArray.map(async (entry, index) => {
        const ext = normalizeUploadExtension(entry?.fileExtension ?? '');
        if (!ext) {
          throw new AppError(`files[${index}].fileExtension is required`, 400);
        }
        if (!isAllowedUploadExtension(narrowedIntent, ext)) {
          throw new AppError(
            `files[${index}].fileExtension is not allowed for intent ${intent}`,
            400
          );
        }
        const ct = resolveContentType(ext, entry.contentType, narrowedIntent);
        const { filename, url, key, publicUrl } = await generatePresignedUrl({
          entityType: narrowedEntityType,
          entityId,
          intent: narrowedIntent,
          fileExtension: ext,
          contentType: ct,
          expiresIn: expiresInSeconds,
        });
        const doc = await Document.create({
          entityType: narrowedEntityType,
          entityId: new mongoose.Types.ObjectId(entityId),
          intent: narrowedIntent,
          filename,
          key,
          publicUrl,
          uploadUrl: url,
          fileExtension: ext,
          contentType: ct,
          status: 'pending',
          expiresAt,
          uploadedBy: ctx.userId,
          uploadedByModel: ctx.uploadedByModel,
        });
        return {
          intent,
          uploadUrl: url,
          key,
          filename,
          publicUrl,
          documentId: doc._id.toString(),
          expiresIn: expiresInSeconds,
          expiresAt: expiresAt.toISOString(),
        };
      })
    );
    sendResponse(reply, 200, { uploads, count: uploads.length }, 'Presigned URLs generated.');
    return;
  }

  const ext = normalizeUploadExtension(fileExtension ?? '');
  if (!ext) {
    throw new AppError('fileExtension is required', 400);
  }
  if (!isAllowedUploadExtension(narrowedIntent, ext)) {
    throw new AppError(`fileExtension is not allowed for intent ${intent}`, 400);
  }
  const ct = resolveContentType(ext, contentType, narrowedIntent);
  const { filename, url, key, publicUrl } = await generatePresignedUrl({
    entityType: narrowedEntityType,
    entityId,
    intent: narrowedIntent,
    fileExtension: ext,
    contentType: ct,
    expiresIn: expiresInSeconds,
  });
  const doc = await Document.create({
    entityType: narrowedEntityType,
    entityId: new mongoose.Types.ObjectId(entityId),
    intent: narrowedIntent,
    filename,
    key,
    publicUrl,
    uploadUrl: url,
    fileExtension: ext,
    contentType: ct,
    status: 'pending',
    expiresAt,
    uploadedBy: ctx.userId,
    uploadedByModel: ctx.uploadedByModel,
  });

  sendResponse(
    reply,
    200,
    {
      uploadUrl: url,
      key,
      filename,
      publicUrl,
      documentId: doc._id.toString(),
      expiresIn: expiresInSeconds,
      expiresAt: expiresAt.toISOString(),
    },
    'Presigned URL generated.'
  );
}

export async function presignedUrlClient(
  request: FastifyRequest<{ Body: PresignedBody }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'client-access') {
    throw new AppError('Unauthorized', 401);
  }

  await handlePresignedUrlRequest(
    request.body,
    {
      uploadedByModel: 'User',
      userId: user.userId,
      allowedIntents: ALLOWED_CLIENT_INTENTS,
      assertEntityOwnership: (entityType, entityId) =>
        assertClientEntityUploadAllowed(user.userId, entityType, entityId),
    },
    reply
  );
}

export async function presignedUrlAdmin(
  request: FastifyRequest<{ Body: PresignedBody }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user) throw new AppError('Unauthorized', 401);

  await handlePresignedUrlRequest(
    request.body,
    {
      uploadedByModel: 'Admin',
      userId: user.userId,
    },
    reply
  );
}

export { handlePresignedUrlRequest, assertClientEntityUploadAllowed, resolveContentType };
