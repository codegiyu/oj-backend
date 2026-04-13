import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Admin } from '../../models/admin';
import { unselectedFields as adminUnselected } from '../../models/admin';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { getAuthUser } from '../../utils/getAuthUser';
import { deleteFields } from '../../utils/helpers';
import { invalidateAuthCache, updateCachedAdmin } from '../../utils/authCache';
import type { ModelAdmin } from '../../lib/types/constants';

function sanitizeAdminForClient(admin: ModelAdmin | Record<string, unknown>): Record<string, unknown> {
  return deleteFields(admin as unknown as Record<string, unknown>, adminUnselected);
}

export async function getAdminMe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'console-access') throw new AppError('Unauthorized', 401);

  const admin = await Admin.findById(auth.userId).lean<ModelAdmin>();
  if (!admin || admin.accountStatus === 'deleted') {
    throw new AppError('Admin not found', 404);
  }

  sendResponse(reply, 200, { user: sanitizeAdminForClient(admin) }, 'Profile loaded.');
}

export async function updateAdminMe(
  request: FastifyRequest<{
    Body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      avatar?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const auth = getAuthUser(request);
  if (!auth || auth.scope !== 'console-access') throw new AppError('Unauthorized', 401);

  const existing = await Admin.findById(auth.userId).lean<ModelAdmin>();
  if (!existing || existing.accountStatus === 'deleted') {
    throw new AppError('Admin not found', 404);
  }

  const updates: Record<string, unknown> = {};
  const body = request.body ?? {};

  if (body.firstName !== undefined) updates.firstName = body.firstName;
  if (body.lastName !== undefined) updates.lastName = body.lastName;
  if (body.avatar !== undefined) updates.avatar = body.avatar;

  if (body.email !== undefined) {
    const normalized = String(body.email).toLowerCase().trim();
    const taken = await Admin.findOne({
      email: normalized,
      _id: { $ne: new mongoose.Types.ObjectId(auth.userId) },
    })
      .select('_id')
      .lean();
    if (taken) throw new AppError('Email already in use', 400);
    if (normalized !== existing.email?.toLowerCase()) {
      await invalidateAuthCache(existing.email, 'admin');
    }
    updates.email = normalized;
  }

  if (Object.keys(updates).length === 0) {
    sendResponse(reply, 200, { user: sanitizeAdminForClient(existing) }, 'No changes.');
    return;
  }

  const admin = await Admin.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(auth.userId), accountStatus: { $ne: 'deleted' } },
    { $set: updates },
    { returnDocument: 'after' }
  ).lean<ModelAdmin>();

  if (!admin) throw new AppError('Admin not found', 404);

  await updateCachedAdmin(admin);
  sendResponse(reply, 200, { user: sanitizeAdminForClient(admin) }, 'Profile updated.');
}
