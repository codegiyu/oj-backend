import { describe, expect, it } from 'vitest';
import {
  artistScopeFilterAndSort,
  resolveArtistListScope,
} from '../../src/constants/artistSections';

describe('artistSections', () => {
  it('resolveArtistListScope maps query flags to scopes', () => {
    expect(resolveArtistListScope({ rising: 'true' })).toBe('rising');
    expect(resolveArtistListScope({ featured: 'true' })).toBe('featured');
    expect(resolveArtistListScope({ spotlight: 'true' })).toBe('spotlight');
    expect(resolveArtistListScope({})).toBe('directory');
  });

  it('rising scope filters isRising and sorts by risingArtistDisplayOrder', () => {
    const { filter, sort } = artistScopeFilterAndSort('rising');

    expect(filter.isRising).toBe(true);
    expect(filter.name).toBeDefined();
    expect(sort).toEqual({ risingArtistDisplayOrder: 1, createdAt: -1 });
  });

  it('featured scope filters isMusicFeatured and sorts by musicFeaturedDisplayOrder', () => {
    const { filter, sort } = artistScopeFilterAndSort('featured');

    expect(filter.isMusicFeatured).toBe(true);
    expect(sort).toEqual({ musicFeaturedDisplayOrder: 1, createdAt: -1 });
  });

  it('spotlight scope filters isCreatorSpotlight and sorts by creatorSpotlightDisplayOrder', () => {
    const { filter, sort } = artistScopeFilterAndSort('spotlight');

    expect(filter.isCreatorSpotlight).toBe(true);
    expect(sort).toEqual({ creatorSpotlightDisplayOrder: 1, createdAt: -1 });
  });

  it('directory scope uses displayOrder', () => {
    const { filter, sort } = artistScopeFilterAndSort('directory');

    expect(filter).toEqual({});
    expect(sort).toEqual({ displayOrder: 1, createdAt: -1 });
  });
});
