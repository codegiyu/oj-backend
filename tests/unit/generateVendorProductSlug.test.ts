import mongoose from 'mongoose';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { generateVendorProductSlug } from '../../src/utils/helpers';
import { Vendor } from '../../src/models/vendor';

type SlugDoc = { slug: string; vendor?: mongoose.Types.ObjectId };

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
  } as unknown as mongoose.Model<SlugDoc>;
}

describe('generateVendorProductSlug', () => {
  const vendorId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('appends vendor slug to product name slug', async () => {
    vi.spyOn(Vendor, 'findById').mockReturnValue(
      mockFindOneResult({ slug: 'ada-fashion' }) as ReturnType<typeof Vendor.findById>
    );

    const model = createSlugModel(new Set());
    const slug = await generateVendorProductSlug(model, vendorId, 'Blue Denim Jacket');

    expect(slug).toBe('blue-denim-jacket-ada-fashion');
  });

  it('uses provided vendorSlug without loading vendor', async () => {
    const findById = vi.spyOn(Vendor, 'findById');
    const model = createSlugModel(new Set());

    const slug = await generateVendorProductSlug(
      model,
      vendorId,
      'Blue Denim Jacket',
      'ada-fashion'
    );

    expect(slug).toBe('blue-denim-jacket-ada-fashion');
    expect(findById).not.toHaveBeenCalled();
  });
});
