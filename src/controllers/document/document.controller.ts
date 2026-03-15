import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { Document } from '../../models/document';
import { headObjectInR2 } from '../../services/r2.service';
import { getAuthUser } from '../../utils/getAuthUser';
import { DOCUMENT_STATUSES } from '../../lib/types/constants';

function parsePositiveInteger(value: unknown, fallback: number, maxVal: number): number {
  if (typeof value !== 'string') return fallback;
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, maxVal);
}

function parseStatus(value: unknown): (typeof DOCUMENT_STATUSES)[number] | undefined {
  if (typeof value !== 'string') return undefined;
  return DOCUMENT_STATUSES.includes(value as (typeof DOCUMENT_STATUSES)[number])
    ? (value as (typeof DOCUMENT_STATUSES)[number])
    : undefined;
}

export async function listDocuments(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      status?: string;
      entityType?: string;
      entityId?: string;
      intent?: string;
      sort?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'console-access') {
    throw new AppError('Access denied: only admins may list documents', 403);
  }

  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const limit = parsePositiveInteger(request.query.limit, 25, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  const status = parseStatus(request.query.status);
  if (status) filter.status = status;
  if (typeof request.query.entityType === 'string') filter.entityType = request.query.entityType;
  const entityId =
    typeof request.query.entityId === 'string' && mongoose.Types.ObjectId.isValid(request.query.entityId)
      ? new mongoose.Types.ObjectId(request.query.entityId)
      : undefined;
  if (entityId) filter.entityId = entityId;
  if (typeof request.query.intent === 'string') filter.intent = request.query.intent;

  const sortField = typeof request.query.sort === 'string' ? request.query.sort : '-createdAt';

  const [documents, total] = await Promise.all([
    Document.find(filter)
      .sort(sortField)
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'uploadedBy',
        select: 'firstName lastName email',
        options: { lean: true },
      })
      .lean(),
    Document.countDocuments(filter),
  ]);

  await reply.status(200).send({
    documents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
}

export async function getDocumentDetails(
  request: FastifyRequest<{ Params: { documentId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'console-access') {
    throw new AppError('Access denied: only admins may view document details', 403);
  }

  const { documentId } = request.params;
  if (!documentId) throw new AppError('Document ID is required', 400);
  if (!mongoose.Types.ObjectId.isValid(documentId)) throw new AppError('Invalid document ID format', 400);

  const document = await Document.findById(documentId)
    .populate({
      path: 'uploadedBy',
      select: 'firstName lastName email',
      options: { lean: true },
    })
    .lean();

  if (!document) throw new AppError('Document not found', 404);

  await reply.status(200).send({ document });
}

export async function verifyDocument(
  request: FastifyRequest<{ Body: { documentId?: string; key?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { documentId, key } = request.body;
  if (!documentId && !key) throw new AppError('documentId or key is required', 400);

  let doc = null;
  if (documentId) {
    if (!mongoose.Types.ObjectId.isValid(documentId)) throw new AppError('Invalid documentId', 400);
    doc = await Document.findOne({ _id: documentId });
  } else if (key) {
    doc = await Document.findOne({ key });
  }
  if (!doc) throw new AppError('Document not found', 404);

  if (doc.status === 'verified') {
    await reply.status(200).send({
      document: {
        _id: doc._id,
        key: doc.key,
        status: doc.status,
        publicUrl: doc.publicUrl,
        filename: doc.filename,
      },
    });
    return;
  }
  if (doc.status === 'expired' || (doc.expiresAt && new Date() > doc.expiresAt)) {
    if (doc.status !== 'expired') await Document.updateOne({ _id: doc._id }, { status: 'expired' });
    await reply.status(410).send({ error: 'Document expired' });
    return;
  }

  const { exists, size } = await headObjectInR2(doc.key);
  const now = new Date();
  if (exists) {
    await Document.updateOne(
      { _id: doc._id },
      {
        status: 'verified',
        uploadedAt: now,
        verifiedAt: now,
        ...(size != null && { size }),
      }
    );
    const updated = await Document.findById(doc._id).lean();
    await reply.status(200).send({ document: updated });
    return;
  }
  await Document.updateOne(
    { _id: doc._id },
    { status: 'failed', errorMessage: 'Object not found in R2' }
  );
  const failed = await Document.findById(doc._id).lean();
  await reply.status(200).send({ document: failed });
}

export async function verifyDocumentAdmin(
  request: FastifyRequest<{ Params: { documentId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'console-access') throw new AppError('Unauthorized', 401);
  const { documentId } = request.params;
  if (!mongoose.Types.ObjectId.isValid(documentId)) throw new AppError('Invalid documentId', 400);

  const doc = await Document.findOne({ _id: documentId });
  if (!doc) throw new AppError('Document not found', 404);

  if (doc.status === 'verified') {
    await reply.status(200).send({
      document: {
        _id: doc._id,
        key: doc.key,
        status: doc.status,
        publicUrl: doc.publicUrl,
        filename: doc.filename,
      },
    });
    return;
  }
  if (doc.status === 'expired' || (doc.expiresAt && new Date() > doc.expiresAt)) {
    if (doc.status !== 'expired') await Document.updateOne({ _id: doc._id }, { status: 'expired' });
    await reply.status(410).send({ error: 'Document expired' });
    return;
  }

  const { exists, size } = await headObjectInR2(doc.key);
  const now = new Date();
  if (exists) {
    await Document.updateOne(
      { _id: doc._id },
      {
        status: 'verified',
        uploadedAt: now,
        verifiedAt: now,
        ...(size != null && { size }),
      }
    );
    const updated = await Document.findById(doc._id).lean();
    await reply.status(200).send({ document: updated });
    return;
  }
  await Document.updateOne(
    { _id: doc._id },
    { status: 'failed', errorMessage: 'Object not found in R2' }
  );
  const failed = await Document.findById(doc._id).lean();
  await reply.status(200).send({ document: failed });
}
