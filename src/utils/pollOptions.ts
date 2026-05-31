import { AppError } from './AppError';

/** Trim, drop empty strings, enforce 2–6 options with case-insensitive uniqueness. */
export function normalizePollOptionTexts(options: string[]): string[] {
  const trimmed = options.map(o => (typeof o === 'string' ? o.trim() : '')).filter(Boolean);
  if (trimmed.length < 2) {
    throw new AppError('At least 2 options are required', 400);
  }
  if (trimmed.length > 6) {
    throw new AppError('At most 6 options are allowed', 400);
  }

  const seen = new Set<string>();
  for (const text of trimmed) {
    const key = text.toLowerCase();
    if (seen.has(key)) {
      throw new AppError('Poll options must be unique', 400);
    }
    seen.add(key);
  }

  return trimmed.slice(0, 6);
}
