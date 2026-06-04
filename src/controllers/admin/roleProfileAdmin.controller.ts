import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { parseObjectId, requireAdmin } from './admin.helpers';
import {
  suspendRoleProfile,
  unsuspendRoleProfile,
  acceptRoleProfileAppeal,
  rejectRoleProfileAppeal,
} from '../../services/roleProfileLifecycle.service';
import type { RoleProfileType } from '../../lib/types/roleProfile';
import { ROLE_PROFILE_TYPES } from '../../lib/types/roleProfile';
import { RoleProfileAppeal } from '../../models/roleProfileAppeal';
import { parsePositiveInteger, parseString } from '../../utils/helpers';
import { leanIdToString } from '../../utils/leanId';

function parseProfileType(value: string): RoleProfileType {
  if ((ROLE_PROFILE_TYPES as readonly string[]).includes(value)) {
    return value as RoleProfileType;
  }
  throw new AppError('Invalid profile type', 400);
}

export async function suspendAdminRoleProfile(
  request: FastifyRequest<{
    Params: { profileType: string; id: string };
    Body: { reason?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const admin = requireAdmin(request);
  const profileType = parseProfileType(request.params.profileType);
  const profileId = parseObjectId(request.params.id);

  await suspendRoleProfile({
    profileType,
    profileId,
    adminId: parseObjectId(admin.userId, 'adminId'),
    reason: request.body?.reason ?? '',
  });

  sendResponse(reply, 200, { success: true }, 'Profile suspended.');
}

export async function unsuspendAdminRoleProfile(
  request: FastifyRequest<{ Params: { profileType: string; id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const admin = requireAdmin(request);
  const profileType = parseProfileType(request.params.profileType);
  const profileId = parseObjectId(request.params.id);

  await unsuspendRoleProfile({
    profileType,
    profileId,
    adminId: parseObjectId(admin.userId, 'adminId'),
  });

  sendResponse(reply, 200, { success: true }, 'Profile unsuspended.');
}

export async function listAdminRoleProfileAppeals(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; status?: string; profileType?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);

  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const limit = parsePositiveInteger(request.query.limit, 20, 100);
  const skip = (page - 1) * limit;
  const filter: Record<string, unknown> = {};

  const status = parseString(request.query.status);
  if (status) filter.status = status;

  const profileType = parseString(request.query.profileType);
  if (profileType) filter.profileType = profileType;

  const [items, total] = await Promise.all([
    RoleProfileAppeal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    RoleProfileAppeal.countDocuments(filter),
  ]);

  const appeals = items.map(doc => ({
    _id: leanIdToString(doc._id),
    profileType: doc.profileType,
    profileId: leanIdToString(doc.profileId),
    userId: leanIdToString(doc.userId),
    status: doc.status,
    message: doc.message,
    adminResponse: doc.adminResponse,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    reviewedAt: doc.reviewedAt instanceof Date ? doc.reviewedAt.toISOString() : doc.reviewedAt,
  }));

  sendResponse(
    reply,
    200,
    {
      appeals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    },
    'Appeals loaded.'
  );
}

export async function acceptAdminRoleProfileAppeal(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const admin = requireAdmin(request);

  await acceptRoleProfileAppeal({
    appealId: parseObjectId(request.params.id),
    adminId: parseObjectId(admin.userId, 'adminId'),
  });

  sendResponse(reply, 200, { success: true }, 'Appeal accepted.');
}

async function suspendByType(
  profileType: RoleProfileType,
  request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const admin = requireAdmin(request);
  await suspendRoleProfile({
    profileType,
    profileId: parseObjectId(request.params.id),
    adminId: parseObjectId(admin.userId, 'adminId'),
    reason: request.body?.reason ?? '',
  });
  sendResponse(reply, 200, { success: true }, 'Profile suspended.');
}

async function unsuspendByType(
  profileType: RoleProfileType,
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const admin = requireAdmin(request);
  await unsuspendRoleProfile({
    profileType,
    profileId: parseObjectId(request.params.id),
    adminId: parseObjectId(admin.userId, 'adminId'),
  });
  sendResponse(reply, 200, { success: true }, 'Profile unsuspended.');
}

export const suspendAdminVendor = (
  req: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>,
  reply: FastifyReply
) => suspendByType('vendor', req, reply);

export const unsuspendAdminVendor = (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => unsuspendByType('vendor', req, reply);

export const suspendAdminArtist = (
  req: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>,
  reply: FastifyReply
) => suspendByType('artist', req, reply);

export const unsuspendAdminArtist = (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => unsuspendByType('artist', req, reply);

export const suspendAdminPastor = (
  req: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>,
  reply: FastifyReply
) => suspendByType('pastor', req, reply);

export const unsuspendAdminPastor = (
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) => unsuspendByType('pastor', req, reply);

export async function rejectAdminRoleProfileAppeal(
  request: FastifyRequest<{ Params: { id: string }; Body: { adminResponse?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const admin = requireAdmin(request);

  await rejectRoleProfileAppeal({
    appealId: parseObjectId(request.params.id),
    adminId: parseObjectId(admin.userId, 'adminId'),
    adminResponse: request.body?.adminResponse ?? '',
  });

  sendResponse(reply, 200, { success: true }, 'Appeal rejected.');
}
