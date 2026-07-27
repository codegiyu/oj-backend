import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import { AppError } from './AppError';

/**
 * Normalize a stored phone/WhatsApp string to digits for wa.me/{digits}.
 * Tries international parse first, then default-country national (e.g. NG 080…).
 */
export function toWhatsAppMeDigits(
  raw: string | undefined | null,
  defaultCountry: CountryCode = 'NG'
): string | null {
  if (!raw?.trim()) return null;

  const trimmed = raw.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  const candidates: Array<{ value: string; country?: CountryCode }> = [{ value: trimmed }];

  if (digitsOnly.length > 0) {
    candidates.push({ value: `+${digitsOnly}` });
    candidates.push({ value: trimmed, country: defaultCountry });
    candidates.push({ value: digitsOnly, country: defaultCountry });
  }

  for (const candidate of candidates) {
    const parsed = candidate.country
      ? parsePhoneNumberFromString(candidate.value, candidate.country)
      : parsePhoneNumberFromString(candidate.value);

    if (parsed?.isPossible()) {
      return `${parsed.countryCallingCode}${parsed.nationalNumber}`;
    }
  }

  return null;
}

/**
 * Normalize a WhatsApp number for storage (E.164 with leading +).
 */
export function toWhatsAppE164(
  raw: string | undefined | null,
  defaultCountry: CountryCode = 'NG'
): string | null {
  const digits = toWhatsAppMeDigits(raw, defaultCountry);

  return digits ? `+${digits}` : null;
}

/**
 * Normalize WhatsApp for persistence. Empty allowed unless allowEmpty is false.
 * Throws AppError when a non-empty value cannot be normalized.
 */
export function normalizeWhatsAppForStorage(
  raw: string | undefined | null,
  options: { allowEmpty?: boolean } = {}
): string {
  const allowEmpty = options.allowEmpty !== false;
  const trimmed = raw?.trim() ?? '';

  if (!trimmed) {
    if (!allowEmpty) {
      throw new AppError('WhatsApp number is required', 400);
    }

    return '';
  }

  const e164 = toWhatsAppE164(trimmed);

  if (!e164) {
    throw new AppError(
      'Invalid WhatsApp number. Include a valid country code (for example +234…).',
      400
    );
  }

  return e164;
}
