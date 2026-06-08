import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/utils/AppError';
import {
  generateUniqueSlug,
  isMongoDuplicateKeyError,
  SLUG_MAX_ATTEMPTS,
  withDuplicateKeyRetry,
} from '../../src/utils/helpers';

type SlugDoc = { slug: string };

function mockFindOneResult(value: unknown) {
  return {
    select: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(value),
    }),
  };
}

function createSlugModel(existingSlugs: Set<string>) {
  return {
    findOne: vi.fn((query: { slug?: string }) => {
      const slug = query.slug ?? '';
      if (existingSlugs.has(slug)) {
        return mockFindOneResult({ _id: 'existing' });
      }

      return mockFindOneResult(null);
    }),
  } as unknown as import('mongoose').Model<SlugDoc>;
}

describe('generateUniqueSlug', () => {
  it('returns the base slug when no collision exists', async () => {
    const model = createSlugModel(new Set());

    await expect(generateUniqueSlug(model, 'My Song Title')).resolves.toBe('my-song-title');
  });

  it('throws AppError after max attempts', async () => {
    const model = {
      findOne: vi.fn(() => mockFindOneResult({ _id: 'existing' })),
    } as unknown as import('mongoose').Model<SlugDoc>;

    await expect(generateUniqueSlug(model, 'My Song', {}, 2)).rejects.toBeInstanceOf(AppError);
  });

  it('uses a random numeric suffix after the first collision', async () => {
    const model = createSlugModel(new Set(['worship']));

    const slug = await generateUniqueSlug(model, 'Worship');

    expect(slug).toMatch(/^worship-\d{4}$/);
  });
});

describe('withDuplicateKeyRetry', () => {
  it('retries on Mongo duplicate key errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ code: 11000 })
      .mockResolvedValueOnce('ok');

    await expect(withDuplicateKeyRetry(fn, 3)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('rethrows non-duplicate errors immediately', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('db down'));

    await expect(withDuplicateKeyRetry(fn, 3)).rejects.toThrow('db down');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('isMongoDuplicateKeyError', () => {
  it('detects code 11000', () => {
    expect(isMongoDuplicateKeyError({ code: 11000 })).toBe(true);
    expect(isMongoDuplicateKeyError({ code: 1 })).toBe(false);
  });
});

describe('SLUG_MAX_ATTEMPTS', () => {
  it('defaults to 50', () => {
    expect(SLUG_MAX_ATTEMPTS).toBe(50);
  });
});
