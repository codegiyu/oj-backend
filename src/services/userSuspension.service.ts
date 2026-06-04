import mongoose from 'mongoose';
import { User } from '../models/user';
import { AppError } from '../utils/AppError';
import { invalidateAuthCache } from '../utils/authCache';
import { enqueueAccountLifecycleEmail } from './accountLifecycleEmail.service';

export async function applyUserAccountStatusUpdate(options: {
  userId: mongoose.Types.ObjectId;
  nextStatus: string;
  suspensionReason?: string;
  adminId?: mongoose.Types.ObjectId;
}): Promise<void> {
  const { userId, nextStatus, suspensionReason, adminId } = options;

  const user = await User.findById(userId)
    .select('email firstName lastName accountStatus suspensionReason suspensionDate')
    .lean();
  if (!user) throw new AppError('User not found', 404);

  const prevStatus = user.accountStatus;

  if (nextStatus === 'suspended') {
    const reason = suspensionReason?.trim();
    if (!reason) throw new AppError('suspensionReason is required when suspending a user', 400);

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          accountStatus: 'suspended',
          suspensionReason: reason,
          suspensionDate: new Date(),
          ...(adminId ? { suspendedBy: adminId } : {}),
          'auth.refreshTokenJTI': '',
        },
      }
    );

    await invalidateAuthCache(user.email, 'user');

    if (prevStatus !== 'suspended') {
      await enqueueAccountLifecycleEmail({
        userId: String(userId),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        event: 'userAccountSuspended',
        reason,
      });
    }
    return;
  }

  if (nextStatus === 'active' && prevStatus === 'suspended') {
    await User.updateOne(
      { _id: userId },
      {
        $set: { accountStatus: 'active' },
        $unset: { suspensionReason: '', suspensionDate: '', suspendedBy: '' },
      }
    );

    await enqueueAccountLifecycleEmail({
      userId: String(userId),
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      event: 'userAccountUnsuspended',
    });
    return;
  }

  await User.updateOne({ _id: userId }, { $set: { accountStatus: nextStatus } });
}
