import mongoose from 'mongoose';
import { Artist } from '../models/artist';
import { Pastor } from '../models/pastor';
import { Vendor } from '../models/vendor';
import { User } from '../models/user';
import { RoleProfileAppeal } from '../models/roleProfileAppeal';
import { AppError } from '../utils/AppError';
import type { ProfileStatus, RoleProfileType } from '../lib/types/roleProfile';
import { isRoleProfileActive } from './profileVisibility';
import { enqueueAccountLifecycleEmail } from './accountLifecycleEmail.service';

const UNSUSPEND_APPEAL_NOTE = 'Resolved — account unsuspended by admin.';

type ProfileDoc = {
  _id: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId | null;
  status?: string;
  profileStatus?: ProfileStatus;
  isActive?: boolean;
  suspensionReason?: string;
};

async function loadProfile(
  profileType: RoleProfileType,
  profileId: mongoose.Types.ObjectId
): Promise<ProfileDoc> {
  if (profileType === 'vendor') {
    const doc = await Vendor.findById(profileId);
    if (!doc) throw new AppError('Vendor not found', 404);
    return doc as unknown as ProfileDoc;
  }
  if (profileType === 'artist') {
    const doc = await Artist.findById(profileId);
    if (!doc) throw new AppError('Artist not found', 404);
    return doc as unknown as ProfileDoc;
  }
  const doc = await Pastor.findById(profileId);
  if (!doc) throw new AppError('Pastor not found', 404);
  return doc as unknown as ProfileDoc;
}

function getRoleStatus(profileType: RoleProfileType, profile: ProfileDoc): string {
  if (profileType === 'vendor') return profile.status ?? 'pending';
  return profile.profileStatus ?? (profile.isActive === false ? 'suspended' : 'active');
}

async function setVendorStatus(
  profileId: mongoose.Types.ObjectId,
  status: string,
  meta: { reason?: string; changedBy?: mongoose.Types.ObjectId; userOrAdmin: 'user' | 'admin' }
): Promise<void> {
  await Vendor.updateOne(
    { _id: profileId },
    {
      $set: {
        status,
        statusChangedAt: new Date(),
        ...(meta.userOrAdmin === 'admin' && meta.changedBy
          ? { statusChangedBy: meta.changedBy }
          : meta.changedBy
            ? { statusChangedBy: meta.changedBy }
            : {}),
        ...(status === 'suspended' && meta.reason ? { suspensionReason: meta.reason } : {}),
        ...(status === 'active' ? { suspensionReason: '', statusChangedBy: null } : {}),
      },
    }
  );
}

async function setArtistOrPastorStatus(
  profileType: 'artist' | 'pastor',
  profileId: mongoose.Types.ObjectId,
  profileStatus: ProfileStatus,
  meta: { reason?: string; changedBy?: mongoose.Types.ObjectId }
): Promise<void> {
  const isActive = profileStatus === 'active';
  const update = {
    $set: {
      profileStatus,
      isActive,
      statusChangedAt: new Date(),
      ...(meta.changedBy ? { statusChangedBy: meta.changedBy } : {}),
      ...(profileStatus === 'suspended' && meta.reason ? { suspensionReason: meta.reason } : {}),
      ...(profileStatus === 'active' ? { suspensionReason: '' } : {}),
    },
  };

  if (profileType === 'artist') {
    await Artist.updateOne({ _id: profileId }, update);
    return;
  }

  await Pastor.updateOne({ _id: profileId }, update);
}

async function resolveOwnerEmail(
  profile: ProfileDoc
): Promise<{ userId: string; email: string; name: string } | null> {
  if (!profile.user) return null;
  const user = await User.findById(profile.user).select('email firstName lastName').lean();
  if (!user) return null;
  return {
    userId: String(user._id),
    email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim(),
  };
}

export async function assertOwnerUserNotSuspended(userId: string): Promise<void> {
  const user = await User.findById(userId).select('accountStatus').lean();
  if (user?.accountStatus === 'suspended') {
    throw new AppError('Your platform account is suspended', 403);
  }
}

export async function suspendRoleProfile(options: {
  profileType: RoleProfileType;
  profileId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  reason: string;
}): Promise<void> {
  const reason = options.reason.trim();
  if (!reason) throw new AppError('Suspension reason is required', 400);

  const profile = await loadProfile(options.profileType, options.profileId);
  const current = getRoleStatus(options.profileType, profile);

  if (current === 'deactivated') {
    throw new AppError(
      'Cannot suspend a user-deactivated profile; user must reactivate first',
      409
    );
  }

  if (options.profileType === 'vendor') {
    if (profile.status === 'pending') throw new AppError('Cannot suspend a pending vendor', 409);
    await setVendorStatus(options.profileId, 'suspended', {
      reason,
      changedBy: options.adminId,
      userOrAdmin: 'admin',
    });
  } else {
    await setArtistOrPastorStatus(options.profileType, options.profileId, 'suspended', {
      reason,
      changedBy: options.adminId,
    });
  }

  const owner = await resolveOwnerEmail(profile);
  if (owner) {
    await enqueueAccountLifecycleEmail({
      userId: owner.userId,
      email: owner.email,
      name: owner.name,
      event: 'roleProfileSuspended',
      reason,
      profileLabel: options.profileType,
    });
  }
}

export async function unsuspendRoleProfile(options: {
  profileType: RoleProfileType;
  profileId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  appealNote?: string;
}): Promise<void> {
  const profile = await loadProfile(options.profileType, options.profileId);
  const current = getRoleStatus(options.profileType, profile);

  if (current !== 'suspended') {
    throw new AppError('Profile is not suspended', 400);
  }

  if (options.profileType === 'vendor') {
    await setVendorStatus(options.profileId, 'active', {
      changedBy: options.adminId,
      userOrAdmin: 'admin',
    });
  } else {
    await setArtistOrPastorStatus(options.profileType, options.profileId, 'active', {
      changedBy: options.adminId,
    });
  }

  const note = options.appealNote?.trim() || UNSUSPEND_APPEAL_NOTE;
  await RoleProfileAppeal.updateMany(
    {
      profileType: options.profileType,
      profileId: options.profileId,
      status: 'pending',
    },
    {
      $set: {
        status: 'accepted',
        adminResponse: note,
        reviewedAt: new Date(),
        reviewedBy: options.adminId,
      },
    }
  );

  const owner = await resolveOwnerEmail(profile);
  if (owner) {
    await enqueueAccountLifecycleEmail({
      userId: owner.userId,
      email: owner.email,
      name: owner.name,
      event: 'roleProfileUnsuspended',
      profileLabel: options.profileType,
    });
  }
}

export async function deactivateRoleProfile(options: {
  profileType: RoleProfileType;
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
}): Promise<void> {
  const profile = await loadProfile(options.profileType, options.profileId);

  if (!isRoleProfileActive(options.profileType, profile as ProfileDoc & { status?: string })) {
    throw new AppError('Profile is not active', 400);
  }

  if (options.profileType === 'vendor') {
    if (profile.status === 'pending')
      throw new AppError('Vendor application is still pending', 409);
    await setVendorStatus(options.profileId, 'deactivated', {
      changedBy: options.userId,
      userOrAdmin: 'user',
    });
  } else {
    await setArtistOrPastorStatus(options.profileType, options.profileId, 'deactivated', {
      changedBy: options.userId,
    });
  }

  const owner = await resolveOwnerEmail(profile);
  if (owner) {
    await enqueueAccountLifecycleEmail({
      userId: owner.userId,
      email: owner.email,
      name: owner.name,
      event: 'roleProfileDeactivated',
      profileLabel: options.profileType,
    });
  }
}

export async function reactivateRoleProfile(options: {
  profileType: RoleProfileType;
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
}): Promise<void> {
  const profile = await loadProfile(options.profileType, options.profileId);
  const current = getRoleStatus(options.profileType, profile);

  if (current !== 'deactivated') {
    throw new AppError('Profile is not deactivated', 400);
  }

  if (options.profileType === 'vendor') {
    await setVendorStatus(options.profileId, 'active', {
      changedBy: options.userId,
      userOrAdmin: 'user',
    });
  } else {
    await setArtistOrPastorStatus(options.profileType, options.profileId, 'active', {
      changedBy: options.userId,
    });
  }

  const owner = await resolveOwnerEmail(profile);
  if (owner) {
    await enqueueAccountLifecycleEmail({
      userId: owner.userId,
      email: owner.email,
      name: owner.name,
      event: 'roleProfileReactivated',
      profileLabel: options.profileType,
    });
  }
}

export async function createRoleProfileAppeal(options: {
  profileType: RoleProfileType;
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  message: string;
}) {
  const message = options.message.trim();
  if (!message) throw new AppError('Appeal message is required', 400);

  const profile = await loadProfile(options.profileType, options.profileId);
  if (getRoleStatus(options.profileType, profile) !== 'suspended') {
    throw new AppError('Appeals are only allowed for suspended profiles', 400);
  }

  const existing = await RoleProfileAppeal.findOne({
    profileType: options.profileType,
    profileId: options.profileId,
    status: 'pending',
  }).lean();

  if (existing) throw new AppError('You already have a pending appeal', 409);

  return RoleProfileAppeal.create({
    profileType: options.profileType,
    profileId: options.profileId,
    userId: options.userId,
    message,
    status: 'pending',
  });
}

export async function rejectRoleProfileAppeal(options: {
  appealId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  adminResponse: string;
}): Promise<void> {
  const response = options.adminResponse.trim();
  if (!response) throw new AppError('adminResponse is required', 400);

  const appeal = await RoleProfileAppeal.findById(options.appealId);
  if (!appeal) throw new AppError('Appeal not found', 404);
  if (appeal.status !== 'pending') throw new AppError('Appeal is not pending', 400);

  appeal.status = 'rejected';
  appeal.adminResponse = response;
  appeal.reviewedAt = new Date();
  appeal.reviewedBy = options.adminId;
  await appeal.save();
}

export async function acceptRoleProfileAppeal(options: {
  appealId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
}): Promise<void> {
  const appeal = await RoleProfileAppeal.findById(options.appealId);
  if (!appeal) throw new AppError('Appeal not found', 404);
  if (appeal.status !== 'pending') throw new AppError('Appeal is not pending', 400);

  await unsuspendRoleProfile({
    profileType: appeal.profileType,
    profileId: new mongoose.Types.ObjectId(String(appeal.profileId)),
    adminId: options.adminId,
    appealNote: 'Appeal accepted.',
  });
}

type AppealSummary = Record<string, unknown> | null;

export function shapeRolePortalMeta(
  profileType: RoleProfileType,
  profile: Record<string, unknown>,
  appeals: { pending: AppealSummary; lastRejected: AppealSummary }
): Record<string, unknown> {
  const status =
    profileType === 'vendor'
      ? (profile.status as string)
      : ((profile.profileStatus as string) ??
        (profile.isActive === false ? 'suspended' : 'active'));

  return {
    portalStatus: status,
    statusChangedAt:
      profile.statusChangedAt instanceof Date
        ? profile.statusChangedAt.toISOString()
        : profile.statusChangedAt,
    suspensionReason: profile.suspensionReason ?? '',
    openAppeal: appeals.pending,
    lastRejectedAppeal: appeals.lastRejected,
  };
}

export async function loadAppealSummariesForProfile(
  profileType: RoleProfileType,
  profileId: mongoose.Types.ObjectId
): Promise<{
  pending: Record<string, unknown> | null;
  lastRejected: Record<string, unknown> | null;
}> {
  const pending = await RoleProfileAppeal.findOne({
    profileType,
    profileId,
    status: 'pending',
  }).lean();

  const lastRejected = await RoleProfileAppeal.findOne({
    profileType,
    profileId,
    status: 'rejected',
  })
    .sort({ reviewedAt: -1 })
    .lean();

  const shape = (doc: Record<string, unknown> | null) =>
    doc
      ? {
          _id: String(doc._id),
          message: doc.message,
          adminResponse: doc.adminResponse,
          status: doc.status,
          createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
          reviewedAt:
            doc.reviewedAt instanceof Date ? doc.reviewedAt.toISOString() : doc.reviewedAt,
        }
      : null;

  return {
    pending: shape(pending as Record<string, unknown> | null),
    lastRejected: shape(lastRejected as Record<string, unknown> | null),
  };
}
