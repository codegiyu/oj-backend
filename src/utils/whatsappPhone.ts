import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

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
