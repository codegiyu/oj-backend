import { AppError } from './AppError';

/** When isMonetizable is true, price must be a number greater than zero. */
export function assertMonetizationPrice(isMonetizable: boolean | undefined, price: unknown): void {
  if (!isMonetizable) return;

  const numeric = typeof price === 'number' ? price : Number(price);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new AppError('Price must be greater than 0 when the item is monetizable', 400);
  }
}

export function resolveMonetizationPrice(
  _isMonetizable: boolean,
  price: unknown,
  existingPrice?: number
): number {
  if (price !== undefined) {
    const numeric = typeof price === 'number' ? price : Number(price);

    return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
  }

  if (existingPrice != null && Number.isFinite(existingPrice)) return existingPrice;

  return 0;
}
