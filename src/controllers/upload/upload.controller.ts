import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { generatePresignedUrl, getContentTypeFromExtension } from '../../services/r2.service';
import { Document } from '../../models/document';
import { ENTITY_TYPES, UPLOAD_INTENTS } from '../../lib/types/constants';
import type { EntityType, UploadIntent } from '../../lib/types/constants';
import { getAuthUser } from '../../utils/getAuthUser';

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
const ALLOWED_CLIENT_INTENTS_SET = new Set(ALLOWED_CLIENT_INTENTS);

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

export async function presignedUrlClient(
  request: FastifyRequest<{ Body: PresignedBody }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'client-access') {
    throw new AppError('Unauthorized', 401);
  }

  const { entityType, entityId, intent, fileExtension, contentType, files } = request.body;
  if (!entityType || !entityId || !intent) {
    throw new AppError('entityType, entityId, and intent are required', 400);
  }
  if (!ENTITY_TYPES_SET.has(entityType)) {
    throw new AppError(`Invalid entityType: ${entityType}`, 400);
  }
  if (entityType !== 'user' || entityId !== user.userId) {
    throw new AppError('You can only upload for your own user profile', 403);
  }
  if (!UPLOAD_INTENTS_SET.has(intent)) {
    throw new AppError(`Invalid intent: ${intent}`, 400);
  }
  if (!ALLOWED_CLIENT_INTENTS_SET.has(intent as UploadIntent)) {
    throw new AppError('This intent is not allowed for client uploads', 403);
  }
  if (!mongoose.Types.ObjectId.isValid(entityId)) {
    throw new AppError('Invalid entityId', 400);
  }

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
        const ext = (entry?.fileExtension ?? '').trim();
        if (!ext) {
          throw new AppError(`files[${index}].fileExtension is required`, 400);
        }
        const ct = resolveContentType(ext, entry.contentType, intent as UploadIntent);
        const { filename, url, key, publicUrl } = await generatePresignedUrl({
          entityType: entityType as EntityType,
          entityId,
          intent: intent as UploadIntent,
          fileExtension: ext,
          contentType: ct,
          expiresIn: expiresInSeconds,
        });
        const doc = await Document.create({
          entityType,
          entityId: new mongoose.Types.ObjectId(entityId),
          intent,
          filename,
          key,
          publicUrl,
          uploadUrl: url,
          fileExtension: ext,
          contentType: ct,
          status: 'pending',
          expiresAt,
          uploadedBy: user.userId,
          uploadedByModel: 'User',
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
    await reply.status(200).send({ uploads, count: uploads.length });
    return;
  }

  const ext = (fileExtension ?? '').trim();
  if (!ext) {
    throw new AppError('fileExtension is required', 400);
  }
  const ct = resolveContentType(ext, contentType, intent as UploadIntent);
  const { filename, url, key, publicUrl } = await generatePresignedUrl({
    entityType: entityType as EntityType,
    entityId,
    intent: intent as UploadIntent,
    fileExtension: ext,
    contentType: ct,
    expiresIn: expiresInSeconds,
  });
  const doc = await Document.create({
    entityType,
    entityId: new mongoose.Types.ObjectId(entityId),
    intent,
    filename,
    key,
    publicUrl,
    uploadUrl: url,
    fileExtension: ext,
    contentType: ct,
    status: 'pending',
    expiresAt,
    uploadedBy: user.userId,
    uploadedByModel: 'User',
  });

  await reply.status(200).send({
    uploadUrl: url,
    key,
    filename,
    publicUrl,
    documentId: doc._id.toString(),
    expiresIn: expiresInSeconds,
    expiresAt: expiresAt.toISOString(),
  });
}

export async function presignedUrlAdmin(
  request: FastifyRequest<{ Body: PresignedBody }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'console-access') {
    throw new AppError('Unauthorized', 401);
  }

  const { entityType, entityId, intent, fileExtension, contentType, files } = request.body;
  if (!entityType || !entityId || !intent) {
    throw new AppError('entityType, entityId, and intent are required', 400);
  }
  if (!ENTITY_TYPES_SET.has(entityType)) {
    throw new AppError(`Invalid entityType: ${entityType}`, 400);
  }
  if (!UPLOAD_INTENTS_SET.has(intent)) {
    throw new AppError(`Invalid intent: ${intent}`, 400);
  }
  if (!mongoose.Types.ObjectId.isValid(entityId)) {
    throw new AppError('Invalid entityId', 400);
  }

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
        const ext = (entry?.fileExtension ?? '').trim();
        if (!ext) {
          throw new AppError(`files[${index}].fileExtension is required`, 400);
        }
        const ct = resolveContentType(ext, entry.contentType, intent as UploadIntent);
        const { filename, url, key, publicUrl } = await generatePresignedUrl({
          entityType: entityType as EntityType,
          entityId,
          intent: intent as UploadIntent,
          fileExtension: ext,
          contentType: ct,
          expiresIn: expiresInSeconds,
        });
        const doc = await Document.create({
          entityType,
          entityId: new mongoose.Types.ObjectId(entityId),
          intent,
          filename,
          key,
          publicUrl,
          uploadUrl: url,
          fileExtension: ext,
          contentType: ct,
          status: 'pending',
          expiresAt,
          uploadedBy: user.userId,
          uploadedByModel: 'Admin',
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
    await reply.status(200).send({ uploads, count: uploads.length });
    return;
  }

  const ext = (fileExtension ?? '').trim();
  if (!ext) {
    throw new AppError('fileExtension is required', 400);
  }
  const ct = resolveContentType(ext, contentType, intent as UploadIntent);
  const { filename, url, key, publicUrl } = await generatePresignedUrl({
    entityType: entityType as EntityType,
    entityId,
    intent: intent as UploadIntent,
    fileExtension: ext,
    contentType: ct,
    expiresIn: expiresInSeconds,
  });
  const doc = await Document.create({
    entityType,
    entityId: new mongoose.Types.ObjectId(entityId),
    intent,
    filename,
    key,
    publicUrl,
    uploadUrl: url,
    fileExtension: ext,
    contentType: ct,
    status: 'pending',
    expiresAt,
    uploadedBy: user.userId,
    uploadedByModel: 'Admin',
  });

  await reply.status(200).send({
    uploadUrl: url,
    key,
    filename,
    publicUrl,
    documentId: doc._id.toString(),
    expiresIn: expiresInSeconds,
    expiresAt: expiresAt.toISOString(),
  });
}
