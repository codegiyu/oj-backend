import { AppError } from '../../utils/AppError';
import type { ModelVendor } from '../../lib/types/constants';

type VendorStatus = ModelVendor['status'];

const STATUS_MESSAGES: Record<Exclude<VendorStatus, 'active'>, string> = {
  pending: 'Your vendor application is pending approval',
  suspended: 'Your vendor account has been suspended',
  inactive: 'Your vendor account is inactive',
};

/** Vendor dashboard routes require an active vendor account. */
export function assertVendorAccountActive(status: VendorStatus): void {
  if (status === 'active') return;

  const message = STATUS_MESSAGES[status];
  throw new AppError(message ?? 'Your vendor account is not active', 403);
}
