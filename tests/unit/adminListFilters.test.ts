import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import {
  applyArtistFilter,
  applyCategoryFilter,
  applyDateRangeFilter,
  applyVendorFilter,
} from '../../src/services/admin/adminListFilters';

describe('applyCategoryFilter', () => {
  it('sets category ObjectId when valid', () => {
    const filter: Record<string, unknown> = {};
    const id = new mongoose.Types.ObjectId().toString();
    applyCategoryFilter(filter, id);
    expect(filter.category).toBeInstanceOf(mongoose.Types.ObjectId);
  });

  it('ignores all and invalid values', () => {
    const filter: Record<string, unknown> = {};
    applyCategoryFilter(filter, 'all');
    applyCategoryFilter(filter, 'not-an-id');
    expect(filter.category).toBeUndefined();
  });
});

describe('applyArtistFilter', () => {
  it('sets artist ObjectId when valid', () => {
    const filter: Record<string, unknown> = {};
    const id = new mongoose.Types.ObjectId().toString();
    applyArtistFilter(filter, id);
    expect(filter.artist).toBeInstanceOf(mongoose.Types.ObjectId);
  });
});

describe('applyVendorFilter', () => {
  it('sets vendor ObjectId when valid', () => {
    const filter: Record<string, unknown> = {};
    const id = new mongoose.Types.ObjectId().toString();
    applyVendorFilter(filter, id);
    expect(filter.vendor).toBeInstanceOf(mongoose.Types.ObjectId);
  });
});

describe('applyDateRangeFilter', () => {
  it('sets createdAt range when dates are valid', () => {
    const filter: Record<string, unknown> = {};
    applyDateRangeFilter(filter, '2026-01-01', '2026-01-31');
    const range = filter.createdAt as { $gte?: Date; $lte?: Date };
    expect(range.$gte).toBeInstanceOf(Date);
    expect(range.$lte).toBeInstanceOf(Date);
  });

  it('ignores invalid dates', () => {
    const filter: Record<string, unknown> = {};
    applyDateRangeFilter(filter, 'not-a-date', undefined);
    expect(filter.createdAt).toBeUndefined();
  });
});
