import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/utils/AppError';
import {
  normalizeWhatsAppForStorage,
  toWhatsAppE164,
  toWhatsAppMeDigits,
} from '../../src/utils/whatsappPhone';

describe('toWhatsAppMeDigits', () => {
  it('normalizes Nigerian local numbers with leading 0', () => {
    expect(toWhatsAppMeDigits('08031234567')).toBe('2348031234567');
  });

  it('normalizes Nigerian national numbers without leading 0', () => {
    expect(toWhatsAppMeDigits('8031234567')).toBe('2348031234567');
  });

  it('normalizes E.164 with spaces and plus', () => {
    expect(toWhatsAppMeDigits('+234 803 123 4567')).toBe('2348031234567');
  });

  it('normalizes digits that already include country code', () => {
    expect(toWhatsAppMeDigits('2348031234567')).toBe('2348031234567');
  });

  it('returns null for empty or impossible values', () => {
    expect(toWhatsAppMeDigits(undefined)).toBeNull();
    expect(toWhatsAppMeDigits('')).toBeNull();
    expect(toWhatsAppMeDigits('abc')).toBeNull();
    expect(toWhatsAppMeDigits('12')).toBeNull();
  });
});

describe('toWhatsAppE164', () => {
  it('returns E.164 with leading plus', () => {
    expect(toWhatsAppE164('08031234567')).toBe('+2348031234567');
  });

  it('returns null when digits cannot be normalized', () => {
    expect(toWhatsAppE164('abc')).toBeNull();
  });
});

describe('normalizeWhatsAppForStorage', () => {
  it('persists E.164 for local Nigerian numbers', () => {
    expect(normalizeWhatsAppForStorage('08031234567')).toBe('+2348031234567');
  });

  it('allows empty when allowEmpty is true', () => {
    expect(normalizeWhatsAppForStorage('')).toBe('');
    expect(normalizeWhatsAppForStorage('   ')).toBe('');
  });

  it('rejects empty when allowEmpty is false', () => {
    expect(() => normalizeWhatsAppForStorage('', { allowEmpty: false })).toThrow(AppError);
  });

  it('rejects impossible numbers', () => {
    expect(() => normalizeWhatsAppForStorage('12')).toThrow(AppError);
  });
});
