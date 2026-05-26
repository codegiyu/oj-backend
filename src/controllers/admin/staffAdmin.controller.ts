import type { FastifyReply, FastifyRequest } from 'fastify';
import { Admin } from '../../models/admin';
import { Role } from '../../models/role';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateRandomString } from '../../utils/helpers';
import { authService } from '../../services/auth.service';
import { assertEmailNotRegisteredAsUser } from '../auth/auth.helpers';
import { sendAdminInviteLink } from '../auth/sendPasswordResetLink';
import { recordAuditEvent } from '../../services/auditLog.service';
import { getAuthUser } from '../../utils/getAuthUser';
import { deleteFields } from '../../utils/helpers';
import { unselectedFields as adminUnselected } from '../../models/admin';
import { runAdminGet, runAdminList } from '../../services/admin/runAdminListGet';
import { findAdminStaffById, listAdminStaffRows } from '../../repositories/admin/staff.repository';
import {
  applyStaffListStatusFilter,
  shapeStaffDetail,
  shapeStaffListItem,
} from './staffAdmin.shapes';
import { parseObjectId } from './admin.helpers';
import type { RoleSlug } from '../../lib/types/constants';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'firstName', 'lastName', 'email'];

export async function listAdminStaff(
  request: FastifyRequest<{
    Querystring: { page?: string; limit?: string; search?: string; status?: string; sort?: string };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: SORT_FIELDS,
    searchFields: ['email', 'firstName', 'lastName'],
    extendFilter: (filter, query) => {
      applyStaffListStatusFilter(filter, query.status);
    },
    listRows: listAdminStaffRows,
    shapeItem: shapeStaffListItem,
    collectionKey: 'staff',
    message: 'Admin staff list loaded.',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminStaff(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminGet(request, {
    findById: findAdminStaffById,
    shapeItem: shapeStaffDetail,
    itemKey: 'staff',
    message: 'Admin staff member loaded.',
    notFoundMessage: 'Admin not found',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function inviteAdminStaff(
  request: FastifyRequest<{
    Body: {
      email?: string;
      firstName?: string;
      lastName?: string;
      roleSlug?: RoleSlug;
      permissions?: string[];
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const {
    email,
    firstName,
    lastName,
    roleSlug = 'admin',
    permissions: bodyPermissions,
  } = request.body ?? {};

  if (!email?.trim() || !firstName?.trim() || !lastName?.trim()) {
    throw new AppError('email, firstName, and lastName are required', 400);
  }

  const emailLower = email.toLowerCase().trim();
  const auth = getAuthUser(request);

  await assertEmailNotRegisteredAsUser(emailLower);

  const existing = await Admin.findOne({ email: emailLower }).lean();
  if (existing) {
    throw new AppError('An admin with this email already exists', 409);
  }

  const role = await Role.findOne({ slug: roleSlug }).lean();
  if (!role) {
    throw new AppError(`Role "${roleSlug}" not found`, 404);
  }

  const rolePermissions = role.permissions ?? [];
  const permissionSlugs =
    bodyPermissions && bodyPermissions.length > 0
      ? bodyPermissions
      : rolePermissions.map(p => p.slug);

  const placeholderPassword = generateRandomString(32);
  const hashedPlaceholder = await authService.hashPassword(placeholderPassword);
  if (!hashedPlaceholder) {
    throw new AppError('Failed to prepare invite', 500);
  }

  const jti = generateRandomString(16, 'JTI');
  const adminPermissions =
    bodyPermissions && bodyPermissions.length > 0
      ? rolePermissions.filter(p => permissionSlugs.includes(p.slug))
      : rolePermissions;

  const newAdmin = await Admin.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: emailLower,
    accountStatus: 'invited',
    auth: {
      password: { value: hashedPlaceholder },
      refreshTokenJTI: jti,
      roles: [{ slug: role.slug, roleId: role._id }],
      permissions: adminPermissions,
    },
  });

  await sendAdminInviteLink({
    email: emailLower,
    firstName: newAdmin.firstName,
    lastName: newAdmin.lastName,
    role: role.slug,
    permissions: permissionSlugs,
  });

  const sanitized = deleteFields(
    newAdmin.toObject() as unknown as Record<string, unknown>,
    adminUnselected
  );

  await recordAuditEvent({
    action: 'admin.invite',
    resourceType: 'staff',
    resourceId: String(newAdmin._id),
    actorId: auth?.userId,
    actorEmail: auth?.email,
    actorScope: auth?.scope,
    requestId: request.id,
    method: request.method,
    path: request.url,
    statusCode: 201,
    metadata: {
      invitedAdminEmail: emailLower,
      roleSlug: role.slug,
    },
  });

  sendResponse(
    reply,
    201,
    { staff: shapeStaffDetail(sanitized) },
    'Admin invited successfully. Invitation email sent.'
  );
}

export async function reinviteAdminStaff(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const auth = getAuthUser(request);
  const admin = await Admin.findById(id).lean();

  if (!admin) {
    throw new AppError('Admin not found', 404);
  }

  if (admin.accountStatus !== 'invited') {
    throw new AppError('Only invited admins can be reinvited', 400);
  }

  const roleSlug = admin.auth?.roles?.[0]?.slug ?? 'admin';
  const permissions = (admin.auth?.permissions ?? []).map((p: { slug: string }) => p.slug);

  await sendAdminInviteLink({
    email: admin.email,
    firstName: admin.firstName,
    lastName: admin.lastName,
    role: roleSlug,
    permissions,
  });

  await recordAuditEvent({
    action: 'admin.invite',
    resourceType: 'staff',
    resourceId: String(admin._id),
    actorId: auth?.userId,
    actorEmail: auth?.email,
    actorScope: auth?.scope,
    requestId: request.id,
    method: request.method,
    path: request.url,
    statusCode: 200,
    metadata: { reinvite: true, invitedAdminEmail: admin.email },
  });

  sendResponse(reply, 200, { success: true }, 'Invitation email resent successfully.');
}
