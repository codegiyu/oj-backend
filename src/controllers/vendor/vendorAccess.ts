import { AppError } from '../../utils/AppError';
import type { ModelVendor } from '../../lib/types/constants';
import { isVendorRoleActive } from '../../services/profileVisibility';

type VendorStatus = ModelVendor['status'];

const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Your vendor application is pending approval',
  suspended: 'Your vendor account has been suspended',
  inactive: 'Your vendor account is inactive',
  deactivated: 'Your vendor store is deactivated',
};

/** Vendor dashboard write routes require an active vendor account. */
export function assertVendorAccountOperational(status: VendorStatus): void {
  if (isVendorRoleActive(status)) return;

  const message = STATUS_MESSAGES[status];
  throw new AppError(message ?? 'Your vendor account is not active', 403);
}
