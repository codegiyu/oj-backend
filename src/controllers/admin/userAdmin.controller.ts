import { FastifyRequest, FastifyReply } from 'fastify';
import { User } from '../../models/user';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { parsePositiveInteger, parseSearch, parseString } from '../../utils/helpers';
import { leanIdToString, parseObjectId, requireAdmin } from './admin.helpers';
import { runAdminList, runAdminGet } from '../../services/admin/runAdminListGet';
import { listAdminUserRows, findAdminUserById } from '../../repositories/admin/user.repository';
import {
  assertPatchableAccountStatus,
  approveUserDeletionRequest,
  linkUserArtist,
  linkUserVendor,
  parseUserLinkId,
  rejectUserDeletionRequest,
} from '../../services/adminUser.service';
import { applyUserListStatusFilter, shapeUserDetail, shapeUserListItem } from './userAdmin.shapes';

export { applyUserListStatusFilter, shapeUserDetail, shapeUserListItem };

const SORT_FIELDS = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email'];

export async function searchAdminUsers(
  request: FastifyRequest<{ Querystring: { search?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const search = parseSearch(request.query.search);
  const limit = parsePositiveInteger(request.query.limit, 20, 50);

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
    ];
  }

  const items = await User.find(filter)
    .select('firstName lastName email artistId')
    .limit(limit)
    .lean();

  const users = (
    items as {
      _id: unknown;
      firstName?: string;
      lastName?: string;
      email?: string;
      artistId?: unknown;
    }[]
  ).map(u => ({
    _id: leanIdToString(u._id),
    email: u.email ?? '',
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    ...(u.artistId != null ? { artistId: leanIdToString(u.artistId) } : {}),
  }));

  sendResponse(reply, 200, { users }, 'Users loaded.');
}

export async function listAdminUsers(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string; status?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: SORT_FIELDS,
    searchFields: ['email', 'firstName', 'lastName', 'phoneNumber'],
    extendFilter: (filter, query) => {
      applyUserListStatusFilter(filter, parseString(query.status));
    },
    listRows: listAdminUserRows,
    shapeItem: shapeUserListItem,
    collectionKey: 'users',
    message: 'Users list loaded.',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function listOrSearchAdminUsers(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
      sort?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const page = parseString(request.query.page);
  if (page) {
    await listAdminUsers(request, reply);
    return;
  }

  await searchAdminUsers(request, reply);
}

export async function getAdminUser(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminGet(request, {
    findById: findAdminUserById,
    shapeItem: shapeUserDetail,
    itemKey: 'user',
    message: 'User loaded.',
    notFoundMessage: 'User not found',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function updateAdminUser(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      accountStatus?: string;
      artistId?: string | null;
      vendorId?: string | null;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const userId = parseObjectId(request.params.id);
  const body = request.body ?? {};

  const hasAccountStatus = body.accountStatus != null;
  const hasArtistLink = body.artistId !== undefined;
  const hasVendorLink = body.vendorId !== undefined;

  if (!hasAccountStatus && !hasArtistLink && !hasVendorLink) {
    throw new AppError('No updatable fields provided', 400);
  }

  if (hasAccountStatus) {
    const nextStatus = assertPatchableAccountStatus(String(body.accountStatus));
    await User.updateOne({ _id: userId }, { $set: { accountStatus: nextStatus } });
  }

  if (hasArtistLink) {
    await linkUserArtist(userId, parseUserLinkId(body.artistId, 'artistId'));
  }

  if (hasVendorLink) {
    await linkUserVendor(userId, parseUserLinkId(body.vendorId, 'vendorId'));
  }

  const doc = await findAdminUserById(String(userId));
  if (!doc) throw new AppError('User not found', 404);

  sendResponse(reply, 200, { user: shapeUserDetail(doc) }, 'User updated.');
}

export async function approveAdminUserDeletion(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const admin = requireAdmin(request);
  const userId = parseObjectId(request.params.id);
  const adminId = parseObjectId(admin.userId, 'adminId');

  await approveUserDeletionRequest(userId, adminId);

  sendResponse(reply, 200, { success: true }, 'Account deletion approved.');
}

export async function rejectAdminUserDeletion(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  requireAdmin(request);
  const userId = parseObjectId(request.params.id);

  await rejectUserDeletionRequest(userId);

  const doc = await findAdminUserById(String(userId));
  if (!doc) throw new AppError('User not found', 404);

  sendResponse(reply, 200, { user: shapeUserDetail(doc) }, 'Deletion request rejected.');
}
