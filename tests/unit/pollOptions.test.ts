import { describe, expect, it } from 'vitest';
import { normalizePollOptionTexts } from '../../src/utils/pollOptions';
import { AppError } from '../../src/utils/AppError';

describe('normalizePollOptionTexts', () => {
  it('accepts unique trimmed options', () => {
    expect(normalizePollOptionTexts([' Yes ', 'No', 'Maybe'])).toEqual(['Yes', 'No', 'Maybe']);
  });

  it('rejects fewer than two options', () => {
    expect(() => normalizePollOptionTexts(['only'])).toThrow(AppError);
  });

  it('rejects duplicate options case-insensitively', () => {
    expect(() => normalizePollOptionTexts(['Yes', 'yes'])).toThrow('Poll options must be unique');
  });
});
