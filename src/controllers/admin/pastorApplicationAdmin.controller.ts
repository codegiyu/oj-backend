import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { PastorApplication } from '../../models/pastorApplication';
import { Pastor } from '../../models/pastor';
import { User } from '../../models/user';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug } from '../../utils/helpers';
import { leanIdToString } from '../../utils/leanId';
import { requireAdmin, parseObjectId } from './admin.helpers';
import { runAdminList, runAdminGet } from '../../services/admin/runAdminListGet';
import { shapePastorApplicationCooldownFields } from '../../utils/pastorApplicationCooldown';

function shapePastorApplicationItem(raw: Record<string, unknown>): Record<string, unknown> {
  const cooldown = shapePastorApplicationCooldownFields(raw as never);

  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    status: raw.status,
    name: raw.name,
    title: raw.title,
    church: raw.church,
    bio: raw.bio,
    image: raw.image,
    expertise: raw.expertise ?? [],
    motivation: raw.motivation,
    rejectionReason: raw.rejectionReason,
    rejectedAt: raw.rejectedAt instanceof Date ? raw.rejectedAt.toISOString() : raw.rejectedAt,
    reviewedAt: raw.reviewedAt instanceof Date ? raw.reviewedAt.toISOString() : raw.reviewedAt,
    reviewedBy: raw.reviewedBy,
    pastor: raw.pastor,
    user: raw.user,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
    ...cooldown,
  };
}

async function listPastorApplicationRows(options: {
  filter: Record<string, unknown>;
  sort: string;
  skip: number;
  limit: number;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  const [items, total] = await Promise.all([
    PastorApplication.find(options.filter)
      .sort(options.sort)
      .populate('user', 'firstName lastName email')
      .populate('pastor', 'name slug image')
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    PastorApplication.countDocuments(options.filter),
  ]);

  return { items: items as unknown as Record<string, unknown>[], total };
}

async function findPastorApplicationById(id: string): Promise<Record<string, unknown> | null> {
  const doc = await PastorApplication.findById(id)
    .populate('user', 'firstName lastName email')
    .populate('pastor', 'name slug image')
    .lean();

  return doc as unknown as Record<string, unknown> | null;
}

export async function listAdminPastorApplications(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string; status?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: ['createdAt', 'updatedAt', 'name', 'status'],
    searchFields: ['name', 'title', 'church', 'bio', 'motivation'],
    listRows: listPastorApplicationRows,
    shapeItem: shapePastorApplicationItem,
    collectionKey: 'applications',
    message: 'Pastor applications list loaded.',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminPastorApplication(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminGet(request, {
    findById: findPastorApplicationById,
    shapeItem: shapePastorApplicationItem,
    itemKey: 'application',
    message: 'Pastor application loaded.',
    notFoundMessage: 'Pastor application not found',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function approveAdminPastorApplication(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId: adminId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);

  const application = await PastorApplication.findById(id);
  if (!application) throw new AppError('Pastor application not found', 404);
  if (application.status === 'approved') throw new AppError('Application is already approved', 409);
  if (application.status !== 'pending') {
    throw new AppError('Only pending applications can be approved', 400);
  }

  const user = await User.findById(application.user).select('pastorId email');
  if (!user) throw new AppError('Applicant user not found', 404);
  if (user.pastorId) throw new AppError('User already has a pastor profile', 409);

  const slug = await generateUniqueSlug(Pastor, application.name.trim());
  const pastor = await Pastor.create({
    user: application.user,
    name: application.name,
    slug,
    title: application.title ?? '',
    church: application.church ?? '',
    bio: application.bio ?? '',
    image: application.image ?? '',
    expertise: application.expertise ?? [],
    isFeatured: false,
    isActive: true,
    displayOrder: 0,
  });

  const linked = await User.findOneAndUpdate(
    { _id: application.user, pastorId: null },
    { $set: { pastorId: pastor._id } },
    { new: true }
  );

  if (!linked) {
    await Pastor.deleteOne({ _id: pastor._id });
    throw new AppError('User already has a pastor profile', 409);
  }

  application.status = 'approved';
  application.pastor = pastor._id;
  application.reviewedAt = new Date();
  application.reviewedBy = new mongoose.Types.ObjectId(adminId);
  application.rejectionReason = '';
  application.rejectedAt = null;
  await application.save();

  const populated = await PastorApplication.findById(application._id)
    .populate('user', 'firstName lastName email')
    .populate('pastor', 'name slug image')
    .lean();

  sendResponse(
    reply,
    200,
    {
      application: shapePastorApplicationItem(
        (populated ?? application.toObject()) as unknown as Record<string, unknown>
      ),
      pastor: {
        _id: leanIdToString(pastor._id),
        name: pastor.name,
        slug: pastor.slug,
      },
    },
    'Pastor application approved.'
  );
}

export async function rejectAdminPastorApplication(
  request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId: adminId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);

  const application = await PastorApplication.findById(id);
  if (!application) throw new AppError('Pastor application not found', 404);
  if (application.status === 'approved') {
    throw new AppError('Approved applications cannot be rejected', 400);
  }

  const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';
  application.status = 'rejected';
  application.rejectionReason = reason;
  application.rejectedAt = new Date();
  application.reviewedAt = new Date();
  application.reviewedBy = new mongoose.Types.ObjectId(adminId);
  await application.save();

  const populated = await PastorApplication.findById(application._id)
    .populate('user', 'firstName lastName email')
    .lean();

  sendResponse(
    reply,
    200,
    {
      application: shapePastorApplicationItem(
        (populated ?? application.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Pastor application rejected.'
  );
}
