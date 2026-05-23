import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/utils/AppError';
import {
  assertMonetizationPrice,
  resolveMonetizationPrice,
} from '../../src/utils/monetizationValidation';

describe('monetizationValidation', () => {
  it('rejects monetizable items without a positive price', () => {
    expect(() => assertMonetizationPrice(true, 0)).toThrow(AppError);
    expect(() => assertMonetizationPrice(true, undefined)).toThrow(AppError);
    expect(() => assertMonetizationPrice(false, 0)).not.toThrow();
  });

  it('accepts monetizable items with price > 0', () => {
    expect(() => assertMonetizationPrice(true, 500)).not.toThrow();
  });

  it('resolves price for non-monetizable items to zero when unset', () => {
    expect(resolveMonetizationPrice(false, undefined)).toBe(0);
    expect(resolveMonetizationPrice(true, 1200)).toBe(1200);
  });
});
