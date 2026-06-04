import { describe, expect, it } from 'vitest';
import { assertVendorAccountOperational } from '../../src/controllers/vendor/vendorAccess';
import { AppError } from '../../src/utils/AppError';

describe('vendorAccess', () => {
  it('allows active vendor accounts', () => {
    expect(() => assertVendorAccountOperational('active')).not.toThrow();
  });

  it('blocks pending vendors with a clear message', () => {
    expect(() => assertVendorAccountOperational('pending')).toThrow(AppError);
    expect(() => assertVendorAccountOperational('pending')).toThrow(
      'Your vendor application is pending approval'
    );
  });

  it('blocks suspended and inactive vendors with clear messages', () => {
    expect(() => assertVendorAccountOperational('suspended')).toThrow(
      'Your vendor account has been suspended'
    );
    expect(() => assertVendorAccountOperational('inactive')).toThrow('Your vendor account is inactive');
  });
});
