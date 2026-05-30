import { describe, expect, it } from 'vitest';
import { assertVendorAccountActive } from '../../src/controllers/vendor/vendorAccess';
import { AppError } from '../../src/utils/AppError';

describe('vendorAccess', () => {
  it('allows active vendor accounts', () => {
    expect(() => assertVendorAccountActive('active')).not.toThrow();
  });

  it('blocks pending vendors with a clear message', () => {
    expect(() => assertVendorAccountActive('pending')).toThrow(AppError);
    expect(() => assertVendorAccountActive('pending')).toThrow(
      'Your vendor application is pending approval'
    );
  });

  it('blocks suspended and inactive vendors with clear messages', () => {
    expect(() => assertVendorAccountActive('suspended')).toThrow(
      'Your vendor account has been suspended'
    );
    expect(() => assertVendorAccountActive('inactive')).toThrow('Your vendor account is inactive');
  });
});
